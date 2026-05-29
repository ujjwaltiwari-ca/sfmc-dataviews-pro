import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { sfmcDataViews } from '../src/data/sfmcSchema';
import { getSupabaseServerClient } from './supabaseClient';

const OPENAI_MODEL = 'gpt-4o-mini';
const DAILY_QUERY_LIMIT = 5;
const DAILY_LIMIT_MESSAGE =
  '⚠️ Daily limit reached. You have used your 5 free AI queries for today. Please return tomorrow!';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

const COMPRESSED_SCHEMA = sfmcDataViews
  .map(
    (table) =>
      `Table: ${table.name}\nFields: ${table.fields.map((field) => field.name).join(', ')}`,
  )
  .join('\n\n');

function buildSystemInstruction(): string {
  return `You are an elite SFMC Architect Copilot for Salesforce Marketing Cloud Data Views and Query Studio SQL. Use exact table names (leading underscores). Reply briefly. Put runnable SQL in \`\`\`sql fences with aliases. Filter large tracking views (_Open, _Click, _Sent) by EventDate when relevant.

You are an exclusive, specialized Salesforce Platform Architect Copilot. Your sole purpose is to assist with Salesforce Marketing Cloud Data Views, SQL queries, and architectural layouts. You must politely decline to answer, write stories, tell jokes, or discuss any topics outside of Salesforce and technical data infrastructure. If a user asks a non-Salesforce question, respond with: 'I am specialized exclusively in Salesforce engineering and architecture. Please let me know how I can help you with your Salesforce Data Views or SQL compilation!'

Compressed Schema Context:
${COMPRESSED_SCHEMA}`;
}

type ClientChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ClientChatMessage[];
};

function resolveOpenAiApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY?.trim() || process.env.VITE_OPENAI_API_KEY?.trim()
  );
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

/** Reject malformed tokens before hitting Supabase auth (avoids noisy throws). */
function isPlausibleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

async function resolveAuthenticatedUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  accessToken: string,
): Promise<{ user: { id: string } } | { error: Response }> {
  if (!isPlausibleJwt(accessToken)) {
    console.error('[chatHandler] Rejected request: malformed JWT structure');
    return { error: jsonError('Unauthorized: invalid or expired session', 401) };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error(
        '[chatHandler] Rejected request: invalid session token',
        authError?.message ?? 'no user',
      );
      return { error: jsonError('Unauthorized: invalid or expired session', 401) };
    }

    return { user };
  } catch (authFailure) {
    const message =
      authFailure instanceof Error ? authFailure.message : 'Token verification failed';
    console.error('[chatHandler] Auth verification threw unexpectedly', message);
    return { error: jsonError('Unauthorized: invalid or expired session', 401) };
  }
}

function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}

async function getTodayUsageCount(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const { count, error } = await supabase
    .from('user_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfUtcDayIso());

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function logSuccessfulQuery(userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const { error } = await supabase.from('user_usage').insert({ user_id: userId });
  if (error) {
    throw new Error(`Failed to write user_usage row: ${error.message}`);
  }
}

function streamSseContent(content: string): Response {
  const encoder = new TextEncoder();

  const sseBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(sseBody, {
    status: 200,
    headers: SSE_HEADERS,
  });
}

function normalizeClientMessages(raw: unknown): ChatCompletionMessageParam[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const normalized: ChatCompletionMessageParam[] = [];

  for (const entry of raw) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('role' in entry) ||
      !('content' in entry)
    ) {
      return null;
    }

    const role = entry.role;
    const content = entry.content;

    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return null;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      continue;
    }

    normalized.push({ role, content: trimmed });
  }

  return normalized;
}

export async function handleChatRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonError('Supabase is not configured on the server', 500);
  }

  const accessToken = extractBearerToken(request);
  if (!accessToken) {
    console.error('[chatHandler] Rejected request: missing or unreadable Authorization Bearer token');
    return jsonError('Unauthorized: valid Bearer token required', 401);
  }

  const authResult = await resolveAuthenticatedUser(supabase, accessToken);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  let todayUsageCount: number;
  try {
    todayUsageCount = await getTodayUsageCount(user.id);
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to check daily usage limit';
    console.error('[chatHandler] Rejected request: usage lookup failed', message);
    return jsonError(`Usage verification failed: ${message}`, 503);
  }

  if (todayUsageCount >= DAILY_QUERY_LIMIT) {
    return streamSseContent(DAILY_LIMIT_MESSAGE);
  }

  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    return jsonError('OpenAI API key is not configured on the server', 500);
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const clientMessages = normalizeClientMessages(body.messages);
  if (!clientMessages) {
    return jsonError('Expected a messages array of { role, content } objects', 400);
  }

  if (clientMessages.length === 0) {
    return jsonError('At least one non-empty message is required', 400);
  }

  const openai = new OpenAI({ apiKey });

  let completionStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    completionStream = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        stream: true,
        messages: [
          { role: 'system', content: buildSystemInstruction() },
          ...clientMessages,
        ],
      },
      { signal: request.signal },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to start OpenAI completion stream';
    return jsonError(message, 502);
  }

  const encoder = new TextEncoder();

  const sseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) {
            continue;
          }

          const payload = JSON.stringify({ content: delta });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

        await logSuccessfulQuery(user.id);

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (streamError) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }

        const message =
          streamError instanceof Error
            ? streamError.message
            : 'Stream interrupted while reading OpenAI response';

        if (message.includes('user_usage')) {
          console.error('[chatHandler] Failed to persist usage row for user', user.id, streamError);
        }

        const payload = JSON.stringify({ error: message });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(sseBody, {
    status: 200,
    headers: SSE_HEADERS,
  });
}
