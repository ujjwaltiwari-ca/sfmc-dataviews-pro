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
  Check,
  Loader2,
  SendHorizontal,
  Sparkles,
  Square,
  Terminal,
  User,
  X,
} from 'lucide-react';
import {
  DAILY_COPILOT_QUERY_LIMIT,
  getRemainingCopilotQueries,
  isDailyCopilotLimitMessage,
} from '../constants/copilotQuota';
import { useAuth } from '../context/authContext.shared';
import { sfmcDataViews } from '../data/sfmcSchema';
import { logCopilotApiError } from '../utils/copilotFallback';
import {
  loadCopilotHistory,
  saveCopilotHistory,
} from '../utils/copilotHistory';
import { lacksTrackingViewDateLookback } from '../utils/sqlGenerator';
import { getSupabase } from '../utils/supabaseClient';
import { AuthForm } from './AuthForm';
import { CopilotMessageContent } from './CopilotMessageContent';
import { TrackingQueryWarningDialog } from './TrackingQueryWarningDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';

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

/** POST /api/chat request body (client → server). */
export type CopilotChatRequestPayload = {
  messages: ApiChatMessage[];
  activeTables: string[];
  currentQueryText: string;
  enterpriseBuMode?: boolean;
};

export type AiCopilotProps = {
  isOpen: boolean;
  onClose: () => void;
  onApplyToSandbox: (sql: string) => void;
  /** Data view names currently selected on the workspace canvas. */
  activeTables?: string[];
  /** SQL currently loaded in the CodeMirror sandbox editor. */
  currentQueryText?: string;
  /** When true, copilot uses Ent. prefix guidance for enterprise BU queries. */
  enterpriseBuMode?: boolean;
};

const STARTER_PROMPTS = [
  'How do I join _Sent to _Open correctly?',
  'Why do I need all 4 keys for tracking view joins?',
  'Write a query to find subscribers with no opens in 90 days',
  "What's the difference between SubscriberKey and SubscriberID in _Sent?",
] as const;

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
    .filter(
      (message) =>
        (message.role === 'user' || message.role === 'assistant') &&
        !message.isStreaming &&
        message.content.trim(),
    )
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
  payload: CopilotChatRequestPayload,
  accessToken: string,
  onDelta: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { messages, activeTables, currentQueryText } = payload;
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
    body: JSON.stringify({
      messages,
      activeTables,
      currentQueryText,
      enterpriseBuMode: payload.enterpriseBuMode === true,
    }),
    signal,
  });

  if (response.status === 401) {
    const authError = new Error('Unauthorized: invalid or expired session');
    (authError as Error & { isAuthError: boolean }).isAuthError = true;
    throw authError;
  }

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

export function AiCopilot({
  isOpen,
  onClose,
  onApplyToSandbox,
  activeTables = [],
  currentQueryText = '',
  enterpriseBuMode = false,
}: AiCopilotProps) {
  const { user, refreshUsage, applyKnownUsageCount, signOut, dailyUsageCount, dailyLimit } =
    useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedBannerVisible, setAppliedBannerVisible] = useState(false);
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [applyWarningOpen, setApplyWarningOpen] = useState(false);
  const [pendingApply, setPendingApply] = useState<{ messageId: string; sql: string } | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const appliedMessageTimerRef = useRef<number | null>(null);
  const appliedBannerTimerRef = useRef<number | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const loadedHistoryUserIdRef = useRef<string | null>(null);

  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      chatAbortRef.current = null;
      if (appliedMessageTimerRef.current !== null) {
        window.clearTimeout(appliedMessageTimerRef.current);
      }
      if (appliedBannerTimerRef.current !== null) {
        window.clearTimeout(appliedBannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      loadedHistoryUserIdRef.current = null;
      setMessages([]);
      setError(null);
      setInput('');
      return;
    }

    if (loadedHistoryUserIdRef.current === user.id) {
      return;
    }

    loadedHistoryUserIdRef.current = user.id;
    const stored = loadCopilotHistory(user.id);
    setMessages(
      stored.map((entry) => ({
        id: createMessageId(),
        role: entry.role,
        content: entry.content,
      })),
    );
    setError(null);
    setInput('');
  }, [user?.id, user]);

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
      void refreshUsage();
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 280);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, user, refreshUsage]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    setError(null);
    setInput('');
    setIsSending(true);
    chatAbortRef.current?.abort();
    const abortController = new AbortController();
    chatAbortRef.current = abortController;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };

    const assistantId = createMessageId();
    streamingAssistantIdRef.current = assistantId;
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

    const { data: sessionData, error: sessionError } = await getSupabase().auth.getSession();
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
      setMessages((previous) => {
        const next = previous.map((message) =>
          message.id === assistantId
            ? { ...message, content, isStreaming: false }
            : message,
        );
        if (user?.id) {
          saveCopilotHistory(user.id, toApiHistory(next));
        }
        return next;
      });
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
      const accumulated = await streamChatFromProxy(
        {
          messages: apiMessages,
          activeTables,
          currentQueryText: currentQueryText.trim(),
          enterpriseBuMode,
        },
        accessToken,
        appendAssistantDelta,
        abortController.signal,
      );
      if (abortController.signal.aborted) {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, isStreaming: false } : message,
          ),
        );
        return;
      }
      finalizeAssistant(accumulated || 'No response received.');
      if (isDailyCopilotLimitMessage(accumulated)) {
        applyKnownUsageCount(DAILY_COPILOT_QUERY_LIMIT);
      }
      void refreshUsage();
    } catch (sendError) {
      if (abortController.signal.aborted) {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, isStreaming: false } : message,
          ),
        );
        return;
      }
      if (sendError instanceof DOMException && sendError.name === 'AbortError') {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId ? { ...message, isStreaming: false } : message,
          ),
        );
        return;
      }
      logCopilotApiError(sendError);
      const isAuthError =
        sendError instanceof Error &&
        ((sendError as Error & { isAuthError?: boolean }).isAuthError === true ||
          sendError.message.includes('Unauthorized'));

      if (isAuthError) {
        await signOut();
        setMessages((previous) => previous.filter((message) => message.id !== assistantId));
        setError('Your session expired. Please sign in again.');
        return;
      }

      const message =
        sendError instanceof Error ? sendError.message : 'Chat request failed. Please try again.';
      setMessages((previous) => previous.filter((entry) => entry.id !== assistantId));
      setError(message);
    } finally {
      streamingAssistantIdRef.current = null;
      if (chatAbortRef.current === abortController) {
        chatAbortRef.current = null;
      }
      setIsSending(false);
    }
  }, [
    input,
    isSending,
    messages,
    activeTables,
    currentQueryText,
    enterpriseBuMode,
    refreshUsage,
    applyKnownUsageCount,
    signOut,
    user?.id,
  ]);

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

  const handleStopGenerating = () => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsSending(false);
    const assistantId = streamingAssistantIdRef.current;
    if (assistantId) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId ? { ...message, isStreaming: false } : message,
        ),
      );
    }
  };

  const commitApplyToSandbox = useCallback(
    (messageId: string, sql: string) => {
      onApplyToSandbox(sql);
      setAppliedMessageId(messageId);
      setAppliedBannerVisible(true);
      if (appliedMessageTimerRef.current !== null) {
        window.clearTimeout(appliedMessageTimerRef.current);
      }
      if (appliedBannerTimerRef.current !== null) {
        window.clearTimeout(appliedBannerTimerRef.current);
      }
      appliedMessageTimerRef.current = window.setTimeout(() => {
        setAppliedMessageId(null);
        appliedMessageTimerRef.current = null;
      }, 2200);
      appliedBannerTimerRef.current = window.setTimeout(() => {
        setAppliedBannerVisible(false);
        appliedBannerTimerRef.current = null;
      }, 2000);
    },
    [onApplyToSandbox],
  );

  const handleApplyToSandbox = (messageId: string, content: string) => {
    const sql = extractSqlFromMessage(content);
    if (!sql) {
      return;
    }
    if (lacksTrackingViewDateLookback(sql)) {
      setPendingApply({ messageId, sql });
      setApplyWarningOpen(true);
      return;
    }
    commitApplyToSandbox(messageId, sql);
  };

  const handleConfirmRiskyApply = () => {
    setApplyWarningOpen(false);
    if (pendingApply) {
      commitApplyToSandbox(pendingApply.messageId, pendingApply.sql);
      setPendingApply(null);
    }
  };

  const handleCancelRiskyApply = () => {
    setApplyWarningOpen(false);
    setPendingApply(null);
  };

  const remainingQueries = getRemainingCopilotQueries(dailyUsageCount, dailyLimit);
  const isAtDailyLimit = remainingQueries === 0;
  const isLowQueries = remainingQueries === 1;

  return (
    <>
      <TrackingQueryWarningDialog
        isOpen={applyWarningOpen}
        onCancel={handleCancelRiskyApply}
        onConfirm={handleConfirmRiskyApply}
        confirmLabel="Apply without date filter"
      />
      <button
        type="button"
        aria-label="Close AI copilot"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-sm transition-all duration-300 ease-out dark:bg-slate-950/40 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        tabIndex={-1}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="AI Copilot"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-slate-200/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.08),-8px_0_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-transform duration-300 ease-out dark:border-slate-700/40 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] sm:w-96 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-violet-400/70 via-cyan-300/30 to-transparent" aria-hidden />

        <header className="shrink-0 border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.25)] ring-1 ring-white/20">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                  AI Copilot
                </p>
                <h2 className="truncate text-base font-semibold tracking-tight text-slate-800 dark:text-white">
                  Schema Assistant
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sfmcDataViews.length} data views
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200/60 bg-white/90 p-2 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/60 hover:bg-slate-50 hover:text-slate-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {user ? (
            <div className="mt-3">
              {remainingQueries === null ? (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Loading usage…</p>
              ) : isAtDailyLimit ? (
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400">
                  Daily limit reached ({dailyUsageCount} of {dailyLimit} used). Resets at midnight UTC.
                </p>
              ) : (
                <p
                  className={`text-[10px] font-medium ${
                    isLowQueries
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {dailyUsageCount} of {dailyLimit} queries used today
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Canvas Context:
            </span>
            {activeTables.length === 0 ? (
              <span className="text-xs italic text-slate-400 dark:text-slate-500">Global Schema</span>
            ) : (
              activeTables.map((tableName) => (
                <span
                  key={tableName}
                  className="rounded-md border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  {tableName}
                </span>
              ))
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {!user ? (
            <AuthForm />
          ) : (
            <>
              {appliedBannerVisible ? (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200 sm:mx-5">
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Applied to sandbox
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/50 via-transparent to-blue-50/20 px-4 py-4 sm:px-5 dark:from-slate-950/50 dark:to-slate-900/30">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/80">
                      <Bot className="h-7 w-7 text-violet-500 dark:text-violet-400" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                      Ask about joins, fields, or SQL
                    </p>
                    <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      I know every SFMC data view in this workspace — primary keys, relationships, and
                      query patterns included.
                    </p>
                    <div className="mt-5 flex w-full max-w-[18rem] flex-col gap-2">
                      {STARTER_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setInput(prompt)}
                          className="rounded-xl border border-slate-200/60 bg-white/90 px-3 py-2 text-left text-xs leading-snug text-slate-700 transition-colors hover:border-violet-300/60 hover:bg-violet-50/50 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
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
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
                            isUser
                              ? 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600 dark:from-violet-950/60 dark:to-violet-950/30 dark:text-violet-400'
                          }`}
                          aria-hidden
                        >
                          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </span>
                        <div
                          className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-all duration-300 ease-out ${
                            isUser
                              ? 'rounded-tr-md bg-slate-800 text-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:bg-slate-100 dark:text-slate-900'
                              : 'rounded-tl-md border border-slate-200/60 bg-white/90 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/80 dark:text-slate-100'
                          }`}
                        >
                          {message.content ? (
                            isUser ? (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            ) : (
                              <CopilotMessageContent content={message.content} />
                            )
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
                              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all duration-300 ease-out ${
                                wasApplied
                                  ? 'border-emerald-300/60 bg-emerald-50/80 text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.08)] dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  : 'border-violet-200/60 bg-white/90 text-violet-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-violet-300/60 hover:bg-violet-50/80 hover:shadow-[0_8px_20px_rgba(139,92,246,0.08)] dark:border-violet-800/60 dark:bg-slate-950/80 dark:text-violet-300 dark:hover:border-violet-600 dark:hover:bg-violet-950/50'
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
                  className="mx-4 mb-2 flex gap-2 rounded-xl border border-red-200/60 bg-red-50/80 px-3 py-2 text-xs text-red-800 backdrop-blur-sm dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 sm:mx-5"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-slate-200/80 bg-white/80 p-3 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-xl border border-slate-200/60 bg-white/90 p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out focus-within:border-violet-300/60 focus-within:shadow-[0_4px_12px_rgba(139,92,246,0.08)] focus-within:ring-2 focus-within:ring-violet-500/15 dark:border-slate-700/60 dark:bg-slate-900/90 dark:focus-within:border-violet-600">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about data views, joins, or SQL…"
                    disabled={isSending}
                    rows={1}
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-300 ease-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
                    aria-label="Message to AI copilot"
                  />
                  <button
                    type={isSending ? 'button' : 'submit'}
                    onClick={isSending ? handleStopGenerating : undefined}
                    disabled={!isSending && !input.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.25)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:from-violet-600 hover:to-cyan-700 hover:shadow-[0_8px_20px_rgba(139,92,246,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    aria-label={isSending ? 'Stop generating' : 'Send message'}
                  >
                    {isSending ? (
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
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
