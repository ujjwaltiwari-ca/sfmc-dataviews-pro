import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerResponse } from 'node:http';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getClientIp } from './lib/clientIp.js';
import { CHAT_POST_LIMIT, checkRateLimit } from './lib/rateLimit.js';
import { assertStagingUnlocked } from './lib/stagingCookieNode.js';
import {
  extractBearerToken,
  getSupabaseServerClient,
  getSupabaseServerConfigError,
  sendJsonError,
  type NodeApiRequest,
} from './lib/supabaseServer.js';
import { buildDynamicCopilotSchemaContext } from '../src/utils/compressSchemaForCopilot.js';
import { isDisposableEmail } from './lib/disposableEmail.js';

const DAILY_COPILOT_QUERY_LIMIT = 5;
const OPENAI_MODEL = 'gpt-4o';
const OPENAI_MAX_OUTPUT_TOKENS = 1500;
const AI_SERVICE_UNAVAILABLE =
  'AI service temporarily unavailable. Please try again later.';
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

/** @deprecated Import resetSupabaseServerClient from ./lib/supabaseServer.js */
export { resetSupabaseServerClient } from './lib/supabaseServer.js';

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
const MAX_REQUEST_BODY_BYTES = 256 * 1024;

const CONTEXT_CODE_GROUNDING_INSTRUCTION = `CONTEXT CODE GROUNDING:
You may receive a user message prefixed with "[Workspace SQL context" containing the SQL currently loaded in the user's workspace editor.
- If that message is present and the SQL is NOT blank, you MUST base your response on it. Analyze its aliases, current filters (like EventDate or JobID), and select fields. Modify or extend this EXACT query to satisfy the user's prompt rather than writing one from scratch. When correcting or adding joins, align aliases to the alias conventions and JOIN GRAPH in RULE 2.
- Only generate a standard foundational template from scratch if no workspace SQL is provided or it is completely empty.`;

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

function escapeMarkdownFenceContent(text: string): string {
  return text.replace(/```/g, '``\\`');
}

function buildCurrentQueryContextMessage(
  currentQueryText: string,
): ChatCompletionMessageParam | null {
  if (!currentQueryText) {
    return null;
  }

  return {
    role: 'user',
    content: `[Workspace SQL context — loaded in the editor; analyze and extend this query when responding]\n\`\`\`sql\n${escapeMarkdownFenceContent(currentQueryText)}\n\`\`\``,
  };
}

function buildSystemInstruction(schemaContext: string, enterpriseBuMode: boolean): string {
  const buContextNote = enterpriseBuMode
    ? `\n### ENTERPRISE BU CONTEXT (active):
The user is querying from a parent (enterprise) business unit. Prefix all system data view table references with Ent. (e.g. Ent._Sent, Ent._Subscribers). Queries run against all child BUs. SendLog and synchronized CRM data extensions do not use the Ent. prefix.`
    : '';

  return `You are the SQL Copilot for DataViews.pro — an SFMC (Salesforce Marketing Cloud) specialist tool. Your only job is to write correct, immediately runnable SQL for SFMC Query Studio. Use exact table names (leading underscores). Reply in clear, practitioner-friendly prose.

### IN SCOPE (always answer these directly — never decline):
- Field definitions and differences (e.g. SubscriberKey vs SubscriberID, JobID vs SendID)
- How to join data views, Pathfinder-style join keys, and engagement quadrinity rules
- Query Studio SQL syntax, filters, retention windows, and known data view limitations
- Deliverability, engagement, list hygiene, Journey, and Automation reporting patterns

Only decline clearly unrelated topics (jokes, general chat, non-SFMC tech). If off-topic, reply briefly that you focus on SFMC Data Views and SQL — do not refuse Data View or field questions.

The user workspace may highlight specific Active Canvas Tables — prefer those views and their documented fields when writing SQL. Auxiliary table names are listed for awareness only unless the user asks to include them.

### SUBSCRIBER IDENTITY:
- SubscriberID (Number): internal numeric ID on a specific list send grain. Part of the four-key engagement join (JobID + ListID + BatchID + SubscriberID).
- SubscriberKey (Text): stable external identifier. Join behavioral views to _Subscribers on SubscriberKey only — never on SubscriberID.

### ALIAS CONVENTIONS (apply to every query):
- NEVER use 'open' as a table alias — OPEN is a SQL reserved keyword in Query Studio. Always alias _Open as 'o'.
- Use single-letter aliases for core tracking views: _Sent s, _Job j, _Open o, _Click c, _Bounce b, _Unsubscribe u.

## RULE 1 — SELECT TOP IS MANDATORY
Every query you write MUST start with SELECT TOP N.
SFMC Query Studio throws a hard error if ORDER BY is used without SELECT TOP.
Use SELECT TOP 200 as the default. Increase to 500 or 1000 if the user asks for a broader result.
Never omit SELECT TOP. There are no exceptions.

## RULE 2 — JOIN GRAPH (copy these verbatim; never invent join keys)
_Sent → _Open:
  s.JobID = o.JobID AND s.ListID = o.ListID AND s.BatchID = o.BatchID AND s.SubscriberID = o.SubscriberID AND o.IsUnique = 1

_Sent → _Click:
  s.JobID = c.JobID AND s.ListID = c.ListID AND s.BatchID = c.BatchID AND s.SubscriberID = c.SubscriberID AND c.IsUnique = 1

_Sent → _Bounce:
  s.JobID = b.JobID AND s.ListID = b.ListID AND s.BatchID = b.BatchID AND s.SubscriberID = b.SubscriberID

_Sent → _Unsubscribe:
  s.JobID = u.JobID AND s.ListID = u.ListID AND s.BatchID = u.BatchID AND s.SubscriberID = u.SubscriberID

_Sent → _Complaint:
  s.JobID = comp.JobID AND s.ListID = comp.ListID AND s.BatchID = comp.BatchID AND s.SubscriberID = comp.SubscriberID

_Sent → _Job:
  s.JobID = j.JobID

_Sent → _JourneyActivity (journey attribution):
  s.TriggererSendDefinitionObjectID = ja.JourneyActivityObjectID

_JourneyActivity → _Journey:
  ja.VersionID = jny.VersionID

_Bounce → _Subscribers:
  b.SubscriberKey = sub.SubscriberKey

_Unsubscribe → _Subscribers:
  u.SubscriberKey = sub.SubscriberKey

_ListSubscribers → _Subscribers:
  ls.SubscriberKey = sub.SubscriberKey

NEVER pull EmailName, FromName, or EmailSubject from _Sent — JOIN _Job on JobID and select j.EmailName, j.FromName, j.EmailSubject.

## RULE 3 — JOIN TYPE
Use LEFT JOIN when joining engagement views (_Open, _Click, _Bounce, _Unsubscribe, _Complaint) to _Sent so sends with zero engagement remain in the result set.
Use INNER JOIN for _Job and _Journey lookups where the record is guaranteed to exist.

## RULE 4 — DIVISION SAFETY
Wrap every denominator in NULLIF(..., 0). Cast numerators to float when dividing.
Example: COUNT(DISTINCT o.SubscriberID) * 100.0 / NULLIF(COUNT(DISTINCT s.SubscriberID), 0)

## RULE 5 — TEST SEND EXCLUSION
When querying _Sent for production data, always add: AND s.TestStormObjID IS NULL
Unless the user explicitly asks to include test sends.

## RULE 6 — CRITICAL FIELD NAMES (consult this table; do not guess)
_Bounce:
  SMTPBounceReason → SMTP error message text (e.g. "550 5.1.1 user unknown")
  BounceCategory → category label only ("Hard bounce", "Soft bounce") — not the error text
  Use LOWER(b.BounceCategory) = 'hard bounce' for case-safe filtering

_JourneyActivity:
  JourneyActivityObjectID → GUID — use this to join to s.TriggererSendDefinitionObjectID
  ActivityID / JourneyActivityID → do NOT use these for the _Sent join

_Unsubscribe:
  WHERE u.ListID = 2 → global unsubscribes (All Subscribers list)

_SMSMessageTracking:
  Mobile → phone number; SMSJobID → Spring 2023+ job GUID; SendJobID → legacy numeric job ID; Description → status code description

## RULE 7 — DATE RANGES
Always include a date filter unless the user says otherwise.
Default: WHERE view.EventDate >= DATEADD(day, -30, GETDATE())
Use s.EventDate on _Sent, o.EventDate on _Open, b.EventDate on _Bounce, etc.

### HOW TO RESPOND
1. One sentence confirming what you are building.
2. The complete SQL in a \`\`\`sql code block. No blank placeholders — use comments like -- replace with your JobID for values the user must supply.
3. Two to four bullet points explaining non-obvious choices (LEFT JOIN, NULLIF, IsUnique = 1, TestStormObjID).
Keep explanations short. The user is an SFMC professional.
If the request is ambiguous, make a reasonable assumption and note it — do not ask a clarifying question before writing the SQL.

${CONTEXT_CODE_GROUNDING_INSTRUCTION}

Schema Context:
${schemaContext}${buContextNote}`;
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
  enterpriseBuMode?: unknown;
};

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
): Promise<{ user: { id: string; email: string | null } } | null> {
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

    return { user: { id: user.id, email: user.email ?? null } };
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

function isRpcNotFoundError(error: { message?: string; code?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    Boolean(error.message?.includes('reserve_copilot_slot'))
  );
}

async function reserveCopilotUsageSlotLegacy(userId: string): Promise<UsageReservation> {
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
  if (countAfter >= DAILY_QUERY_LIMIT) {
    await supabase.from('user_usage').delete().eq('id', usageRowId);
    return { ok: false, reason: 'limit' };
  }

  return { ok: true, usageRowId };
}

async function reserveCopilotUsageSlot(userId: string): Promise<UsageReservation> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const { data, error } = await supabase.rpc('reserve_copilot_slot', {
    p_user_id: userId,
    p_limit: DAILY_QUERY_LIMIT,
  });

  if (error) {
    if (isRpcNotFoundError(error)) {
      console.warn('[api/chat] reserve_copilot_slot RPC missing — using legacy quota path');
      return reserveCopilotUsageSlotLegacy(userId);
    }
    throw new Error(`Failed to reserve usage slot: ${error.message}`);
  }

  if (data === null || data === undefined) {
    return { ok: false, reason: 'limit' };
  }

  return { ok: true, usageRowId: data as string | number };
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
      if (Buffer.byteLength(req.body, 'utf8') > MAX_REQUEST_BODY_BYTES) {
        return Promise.reject(new Error('Request body too large'));
      }
      return Promise.resolve(req.body);
    }
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_REQUEST_BODY_BYTES) {
      return Promise.reject(new Error('Request body too large'));
    }
    return Promise.resolve(serialized);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        reject(new Error('Request body too large'));
        return;
      }
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

  if (!assertStagingUnlocked(req.headers.cookie)) {
    sendJsonError(res, 'Staging gate locked', 401);
    return;
  }

  const supabase = getSupabaseServerClient();
  const configError = getSupabaseServerConfigError();
  if (!supabase || configError) {
    console.error('[api/chat] Supabase config error:', configError ?? 'unknown');
    sendJsonError(res, configError ?? 'Supabase is not configured on the server', 500);
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

  if (user.email && isDisposableEmail(user.email)) {
    sendJsonError(res, 'Sign-ups from disposable email domains are not allowed.', 403);
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimit = await checkRateLimit(
    `chat-post:${clientIp}:${user.id}`,
    CHAT_POST_LIMIT.max,
    CHAT_POST_LIMIT.windowMs,
  );
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds ?? 60));
    sendJsonError(res, 'Too many requests. Please slow down and try again.', 429);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    sendJsonError(
      res,
      'OpenAI API key is not configured. Set OPENAI_API_KEY in Vercel env.',
      500,
    );
    return;
  }

  let body: ChatRequestBody;
  try {
    const rawBody = await readRequestBody(req);
    body = rawBody ? (JSON.parse(rawBody) as ChatRequestBody) : {};
  } catch (parseError) {
    const message =
      parseError instanceof Error && parseError.message === 'Request body too large'
        ? 'Request body too large'
        : 'Invalid JSON body';
    sendJsonError(res, message, parseError instanceof Error && message.includes('large') ? 413 : 400);
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
  const currentQueryContextMessage = buildCurrentQueryContextMessage(currentQueryText);
  const enterpriseBuMode = body.enterpriseBuMode === true;

  let usageReservation: UsageReservation;
  try {
    usageReservation = await reserveCopilotUsageSlot(user.id);
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to check daily usage limit';
    console.error('[api/chat] Rejected request: usage reservation failed', message);
    sendJsonError(res, 'Usage verification failed. Please try again later.', 503);
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
        max_tokens: OPENAI_MAX_OUTPUT_TOKENS,
        messages: [
          { role: 'system', content: buildSystemInstruction(schemaContext, enterpriseBuMode) },
          ...(currentQueryContextMessage ? [currentQueryContextMessage] : []),
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
    console.error('[api/chat] OpenAI stream creation failed', message);
    sendJsonError(res, AI_SERVICE_UNAVAILABLE, 502);
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
        console.error('[api/chat] OpenAI stream read failed', message);
        writeSseData(res, { error: AI_SERVICE_UNAVAILABLE });
        res.end();
      }
    }
  } finally {
    req.off('aborted', onClientClose);
    req.off('close', onClientClose);
  }
}

export default handleChatRequest;
