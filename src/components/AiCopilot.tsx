import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  Bot,
  Loader2,
  SendHorizontal,
  Sparkles,
  Terminal,
  User,
  X,
} from 'lucide-react';
import { sfmcDataViews } from '../data/sfmcSchema';
import { logCopilotApiError } from '../utils/copilotFallback';
import { supabase } from '../utils/supabaseClient';
import { AuthForm } from './AuthForm';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
};

type ApiChatMessage = {
  role: ChatRole;
  content: string;
};

export type AiCopilotProps = {
  isOpen: boolean;
  onClose: () => void;
  onApplyToSandbox: (sql: string) => void;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SQL_FENCE_PATTERN = /```(?:sql)?\s*([\s\S]*?)```/gi;

function extractSqlFromMessage(content: string): string | null {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  SQL_FENCE_PATTERN.lastIndex = 0;
  while ((match = SQL_FENCE_PATTERN.exec(content)) !== null) {
    const block = match[1]?.trim();
    if (block) {
      blocks.push(block);
    }
  }
  if (blocks.length > 0) {
    return blocks[blocks.length - 1] ?? null;
  }

  const trimmed = content.trim();
  if (/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function toApiHistory(messages: ChatMessage[]): ApiChatMessage[] {
  return messages
    .filter((message) => !message.isStreaming && message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

type SsePayload = {
  content?: string;
  error?: string;
};

function processSseLine(
  line: string,
  accumulated: string,
  onDelta: (content: string) => void,
): string {
  if (!line.startsWith('data: ')) {
    return accumulated;
  }

  const data = line.slice(6).trim();
  if (!data || data === '[DONE]') {
    return accumulated;
  }

  let parsed: SsePayload;
  try {
    parsed = JSON.parse(data) as SsePayload;
  } catch {
    return accumulated;
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  if (!parsed.content) {
    return accumulated;
  }

  const next = accumulated + parsed.content;
  onDelta(next);
  return next;
}

async function streamChatFromProxy(
  messages: ApiChatMessage[],
  accessToken: string,
  onDelta: (accumulated: string) => void,
): Promise<string> {
  const bearerToken = accessToken.trim();
  if (!bearerToken) {
    throw new Error('Unauthorized: session access token is missing');
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = `Chat request failed (${response.status})`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        detail = errorBody.error;
      }
    } catch {
      // keep default detail
    }
    throw new Error(detail);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body from chat API');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      accumulated = processSseLine(line, accumulated, onDelta);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      accumulated = processSseLine(line, accumulated, onDelta);
    }
  }

  return accumulated;
}

export function AiCopilot({ isOpen, onClose, onApplyToSandbox }: AiCopilotProps) {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 280);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, user]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    setError(null);
    setInput('');
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };

    const assistantId = createMessageId();
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    const historyForApi = toApiHistory(messages);
    const apiMessages: ApiChatMessage[] = [
      ...historyForApi,
      { role: 'user', content: trimmed },
    ];

    setMessages((previous) => [...previous, userMessage, assistantPlaceholder]);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setMessages((previous) => previous.filter((message) => message.id !== assistantId));
      setError('Unable to read your session. Please sign in again.');
      setIsSending(false);
      return;
    }

    const accessToken = sessionData.session?.access_token?.trim();
    if (!accessToken) {
      setMessages((previous) => previous.filter((message) => message.id !== assistantId));
      setError('Your session expired. Please sign in again.');
      setIsSending(false);
      return;
    }

    const finalizeAssistant = (content: string) => {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId
            ? { ...message, content, isStreaming: false }
            : message,
        ),
      );
    };

    const appendAssistantDelta = (accumulated: string) => {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId
            ? { ...message, content: accumulated, isStreaming: true }
            : message,
        ),
      );
    };

    try {
      const accumulated = await streamChatFromProxy(apiMessages, accessToken, appendAssistantDelta);
      finalizeAssistant(accumulated || 'No response received.');
    } catch (sendError) {
      logCopilotApiError(sendError);
      const message =
        sendError instanceof Error ? sendError.message : 'Chat request failed. Please try again.';
      setError(message);
      finalizeAssistant(message);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleApplyToSandbox = (messageId: string, content: string) => {
    const sql = extractSqlFromMessage(content);
    if (!sql) {
      return;
    }
    onApplyToSandbox(sql);
    onClose();
    setAppliedMessageId(messageId);
    window.setTimeout(() => setAppliedMessageId(null), 2200);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close AI copilot"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="AI Copilot"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-slate-200/90 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-800/90 dark:bg-slate-950 sm:w-96 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="shrink-0 border-b border-slate-200/90 bg-gradient-to-r from-violet-50/90 via-white to-cyan-50/50 px-4 py-4 dark:border-slate-800 dark:from-violet-950/50 dark:via-slate-950 dark:to-cyan-950/30 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-600 text-white shadow-lg shadow-violet-500/20 ring-1 ring-white/20">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                  AI Copilot
                </p>
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                  Schema Assistant
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sfmcDataViews.length} data views · GPT-4o mini
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {!user ? (
            <AuthForm />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
                      <Bot className="h-7 w-7 text-violet-500 dark:text-violet-400" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                      Ask about joins, fields, or SQL
                    </p>
                    <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      I know every SFMC data view in this workspace — primary keys, relationships, and
                      query patterns included.
                    </p>
                  </div>
                )}

                <ul className="space-y-4" aria-live="polite" aria-relevant="additions text">
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    const extractedSql =
                      !isUser && !message.isStreaming ? extractSqlFromMessage(message.content) : null;
                    const wasApplied = appliedMessageId === message.id;
                    return (
                      <li
                        key={message.id}
                        className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isUser
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400'
                          }`}
                          aria-hidden
                        >
                          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? 'rounded-tr-md bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900'
                              : 'rounded-tl-md border border-slate-200/90 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100'
                          }`}
                        >
                          {message.content ? (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          ) : message.isStreaming ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              Thinking…
                            </span>
                          ) : null}
                          {message.isStreaming && message.content ? (
                            <span
                              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-500 align-middle dark:bg-violet-400"
                              aria-hidden
                            />
                          ) : null}
                          {extractedSql ? (
                            <button
                              type="button"
                              onClick={() => handleApplyToSandbox(message.id, message.content)}
                              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                                wasApplied
                                  ? 'border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  : 'border-violet-200/90 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-950 dark:text-violet-300 dark:hover:border-violet-600 dark:hover:bg-violet-950/50'
                              }`}
                            >
                              <Terminal className="h-3.5 w-3.5" aria-hidden />
                              {wasApplied ? 'Applied to Sandbox' : 'Apply to Sandbox'}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
              </div>

              {error && (
                <div
                  className="mx-4 mb-2 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 sm:mx-5"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-slate-200/90 bg-slate-50/80 p-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-violet-600">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about data views, joins, or SQL…"
                    disabled={isSending}
                    rows={1}
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
                    aria-label="Message to AI copilot"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-600 text-white shadow-md transition hover:from-violet-600 hover:to-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <SendHorizontal className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                  Enter to send · Shift+Enter for newline
                </p>
              </form>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
