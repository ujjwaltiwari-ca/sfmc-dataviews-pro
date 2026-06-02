import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { buildDynamicCopilotSchemaContext } from '../src/utils/compressSchemaForCopilot';

const DAILY_COPILOT_QUERY_LIMIT = 5;
const OPENAI_MODEL = 'gpt-4o-mini';
const DAILY_QUERY_LIMIT = DAILY_COPILOT_QUERY_LIMIT;

/** Last 6 messages = 3 user/assistant turns. */
const MAX_CHAT_HISTORY_MESSAGES = 6;
const MAX_CHAT_MESSAGE_CHARACTERS = 2500;

function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}

const DAILY_LIMIT_MESSAGE =
  '⚠️ Daily limit reached. You have used your 5 free AI queries for today. Please return tomorrow!';

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
};

let supabaseServerClient: SupabaseClient | null = null;

/** Clears the cached Supabase client (used by the Vite dev middleware when env is rebound). */
export function resetSupabaseServerClient(): void {
  supabaseServerClient = null;
}

function getSupabaseServerClient(): SupabaseClient | null {
  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  supabaseServerClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerClient;
}

async function getTodayCopilotUsageCount(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const dayStartUtc = startOfUtcDayIso();

  const { count, error } = await supabase
    .from('user_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayStartUtc);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

const MAX_CURRENT_QUERY_TEXT_CHARACTERS = 16_000;

const CONTEXT_CODE_GROUNDING_INSTRUCTION = `CONTEXT CODE GROUNDING:
You are provided with a parameter called \`currentQueryText\`, representing the code currently loaded in the user's workspace editor window.
- If \`currentQueryText\` is NOT blank or empty, you MUST base your response on it. Analyze its aliases, current filters (like EventDate or JobID), and select fields. Modify or extend this EXACT query to satisfy the user's prompt rather than writing one from scratch. Preserve their alias conventions (e.g., use 'sent' instead of 's', and 'job' instead of 'j').
- Only generate a standard foundational template from scratch if \`currentQueryText\` is completely empty or blank.`;

function normalizeCurrentQueryText(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= MAX_CURRENT_QUERY_TEXT_CHARACTERS) {
    return trimmed;
  }

  return trimmed.slice(0, MAX_CURRENT_QUERY_TEXT_CHARACTERS);
}

function buildCurrentQueryTextSection(currentQueryText: string): string {
  if (!currentQueryText) {
    return '\n\ncurrentQueryText: (empty — workspace editor has no SQL loaded)';
  }

  return `\n\ncurrentQueryText (loaded in workspace editor):\n\`\`\`sql\n${currentQueryText}\n\`\`\``;
}

function buildSystemInstruction(schemaContext: string, currentQueryText: string): string {
  return `You are an elite SFMC Architect Copilot for Salesforce Marketing Cloud Data Views and Query Studio SQL. Use exact table names (leading underscores). Reply briefly. Put runnable SQL in \`\`\`sql fences with aliases. Filter large tracking views (_Open, _Click, _Sent) by EventDate when relevant.

You are an exclusive, specialized Salesforce Platform Architect Copilot. Your sole purpose is to assist with Salesforce Marketing Cloud Data Views, SQL queries, and architectural layouts. You must politely decline to answer, write stories, tell jokes, or discuss any topics outside of Salesforce and technical data infrastructure. If a user asks a non-Salesforce question, respond with: 'I am specialized exclusively in Salesforce engineering and architecture. Please let me know how I can help you with your Salesforce Data Views or SQL compilation!'

The user workspace may highlight specific Active Canvas Tables — prefer those views and their documented fields when writing SQL. Auxiliary table names are listed for awareness only unless the user asks to include them.

${CONTEXT_CODE_GROUNDING_INSTRUCTION}${buildCurrentQueryTextSection(currentQueryText)}

Schema Context:
${schemaContext}`;
}

function truncateChatMessageContent(content: string): string {
  if (content.length <= MAX_CHAT_MESSAGE_CHARACTERS) {
    return content;
  }
  return content.slice(0, MAX_CHAT_MESSAGE_CHARACTERS);
}

function enforceChatPayloadBoundaries(
  messages: ChatCompletionMessageParam[],
): ChatCompletionMessageParam[] {
  const bounded = messages.map((message) => {
    if (typeof message.content !== 'string') {
      return message;
    }
    return { ...message, content: truncateChatMessageContent(message.content) };
  });

  if (bounded.length <= MAX_CHAT_HISTORY_MESSAGES) {
    return bounded;
  }

  return bounded.slice(-MAX_CHAT_HISTORY_MESSAGES);
}

type ClientChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ClientChatMessage[];
  activeTables?: unknown;
  currentQueryText?: unknown;
};

type NodeApiRequest = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendJsonError(res: ServerResponse, message: string, status: number): void {
  sendJson(res, status, { error: message });
}

function extractBearerToken(request: NodeApiRequest): string | null {
  const raw =
    request.headers['authorization'] ?? request.headers.authorization;
  const authHeader = Array.isArray(raw) ? raw[0] : raw;

  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function isPlausibleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

async function resolveAuthenticatedUser(
  supabase: SupabaseClient,
  accessToken: string,
  res: ServerResponse,
): Promise<{ user: { id: string } } | null> {
  if (!isPlausibleJwt(accessToken)) {
    console.error('[api/chat] Rejected request: malformed JWT structure');
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return null;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error(
        '[api/chat] Rejected request: invalid session token',
        authError?.message ?? 'no user',
      );
      sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
      return null;
    }

    return { user };
  } catch (authFailure) {
    const message =
      authFailure instanceof Error ? authFailure.message : 'Token verification failed';
    console.error('[api/chat] Auth verification threw unexpectedly', message);
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return null;
  }
}

type UsageReservation =
  | { ok: true; usageRowId: string | number }
  | { ok: false; reason: 'limit' };

async function reserveCopilotUsageSlot(userId: string): Promise<UsageReservation> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const countBefore = await getTodayCopilotUsageCount(userId);
  if (countBefore >= DAILY_QUERY_LIMIT) {
    return { ok: false, reason: 'limit' };
  }

  const { data, error } = await supabase
    .from('user_usage')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to reserve user_usage row: ${error.message}`);
  }

  const usageRowId = data?.id;
  if (usageRowId === null || usageRowId === undefined) {
    throw new Error('Failed to reserve user_usage row: missing row id');
  }

  const countAfter = await getTodayCopilotUsageCount(userId);
  if (countAfter > DAILY_QUERY_LIMIT) {
    await supabase.from('user_usage').delete().eq('id', usageRowId);
    return { ok: false, reason: 'limit' };
  }

  return { ok: true, usageRowId };
}

async function releaseCopilotUsageSlot(usageRowId: string | number): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('user_usage').delete().eq('id', usageRowId);
  if (error) {
    console.error('[api/chat] Failed to release reserved user_usage row', usageRowId, error.message);
  }
}

function getLatestUserPrompt(messages: ChatCompletionMessageParam[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'user' && typeof message.content === 'string') {
      return message.content;
    }
  }

  return '';
}

async function logConversationAnalytics(
  userId: string,
  userPrompt: string,
  aiResponse: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error('[api/chat] conversation_logs skipped: Supabase is not configured');
    return;
  }

  try {
    const { error } = await supabase.from('conversation_logs').insert({
      user_id: userId,
      user_prompt: userPrompt,
      ai_response: aiResponse,
    });

    if (error) {
      console.error(
        '[api/chat] Failed to write conversation_logs row for user',
        userId,
        error.message,
      );
    }
  } catch (logFailure) {
    const message =
      logFailure instanceof Error ? logFailure.message : 'Unknown conversation logging error';
    console.error(
      '[api/chat] conversation_logs insert threw unexpectedly for user',
      userId,
      message,
    );
  }
}

function writeSseData(res: ServerResponse, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function streamSseContent(res: ServerResponse, content: string): void {
  res.statusCode = 200;
  for (const [key, value] of Object.entries(SSE_HEADERS)) {
    res.setHeader(key, value);
  }
  writeSseData(res, { content });
  res.write('data: [DONE]\n\n');
  res.end();
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

function readRequestBody(req: NodeApiRequest): Promise<string> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return Promise.resolve(req.body);
    }
    return Promise.resolve(JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

function isClientDisconnected(req: NodeApiRequest, res: ServerResponse): boolean {
  return req.aborted === true || res.writableEnded || res.destroyed;
}

export async function handleChatRequest(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJsonError(res, 'Method not allowed', 405);
    return;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    sendJsonError(res, 'Supabase is not configured on the server', 500);
    return;
  }

  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    console.error('[api/chat] Rejected request: missing or unreadable Authorization Bearer token');
    sendJsonError(res, 'Unauthorized: valid Bearer token required', 401);
    return;
  }

  const authResult = await resolveAuthenticatedUser(supabase, accessToken, res);
  if (!authResult) {
    return;
  }

  const { user } = authResult;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    sendJsonError(res, 'OpenAI API key is not configured on the server', 500);
    return;
  }

  let body: ChatRequestBody;
  try {
    const rawBody = await readRequestBody(req);
    body = rawBody ? (JSON.parse(rawBody) as ChatRequestBody) : {};
  } catch {
    sendJsonError(res, 'Invalid JSON body', 400);
    return;
  }

  const normalizedMessages = normalizeClientMessages(body.messages);
  if (!normalizedMessages) {
    sendJsonError(res, 'Expected a messages array of { role, content } objects', 400);
    return;
  }

  const clientMessages = enforceChatPayloadBoundaries(normalizedMessages);

  if (clientMessages.length === 0) {
    sendJsonError(res, 'At least one non-empty message is required', 400);
    return;
  }

  const schemaContext = buildDynamicCopilotSchemaContext(
    Array.isArray(body.activeTables) ? body.activeTables : [],
  );
  const currentQueryText = normalizeCurrentQueryText(body.currentQueryText);

  let usageReservation: UsageReservation;
  try {
    usageReservation = await reserveCopilotUsageSlot(user.id);
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to check daily usage limit';
    console.error('[api/chat] Rejected request: usage reservation failed', message);
    sendJsonError(res, `Usage verification failed: ${message}`, 503);
    return;
  }

  if (!usageReservation.ok) {
    streamSseContent(res, DAILY_LIMIT_MESSAGE);
    return;
  }

  const reservedUsageRowId = usageReservation.usageRowId;
  const openai = new OpenAI({ apiKey });

  const abortController = new AbortController();
  const onClientClose = () => {
    abortController.abort();
  };
  req.on('aborted', onClientClose);
  req.on('close', onClientClose);

  let completionStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    completionStream = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        stream: true,
        messages: [
          { role: 'system', content: buildSystemInstruction(schemaContext, currentQueryText) },
          ...clientMessages,
        ],
      },
      { signal: abortController.signal },
    );
  } catch (error) {
    req.off('aborted', onClientClose);
    req.off('close', onClientClose);
    await releaseCopilotUsageSlot(reservedUsageRowId);
    const message =
      error instanceof Error ? error.message : 'Failed to start OpenAI completion stream';
    sendJsonError(res, message, 502);
    return;
  }

  res.statusCode = 200;
  for (const [key, value] of Object.entries(SSE_HEADERS)) {
    res.setHeader(key, value);
  }

  const latestUserPrompt = getLatestUserPrompt(clientMessages);
  let accumulatedAssistantText = '';

  try {
    for await (const chunk of completionStream) {
      if (isClientDisconnected(req, res)) {
        break;
      }

      const delta = chunk.choices[0]?.delta?.content;
      if (!delta) {
        continue;
      }

      accumulatedAssistantText += delta;
      writeSseData(res, { content: delta });
    }

    if (!isClientDisconnected(req, res)) {
      await logConversationAnalytics(user.id, latestUserPrompt, accumulatedAssistantText);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (streamError) {
    if (!abortController.signal.aborted) {
      await releaseCopilotUsageSlot(reservedUsageRowId);

      if (!isClientDisconnected(req, res)) {
        const message =
          streamError instanceof Error
            ? streamError.message
            : 'Stream interrupted while reading OpenAI response';
        writeSseData(res, { error: message });
        res.end();
      }
    }
  } finally {
    req.off('aborted', onClientClose);
    req.off('close', onClientClose);
  }
}

export default handleChatRequest;
