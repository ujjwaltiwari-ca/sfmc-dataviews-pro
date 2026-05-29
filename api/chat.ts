import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const DAILY_COPILOT_QUERY_LIMIT = 5;
const OPENAI_MODEL = 'gpt-4o-mini';
const DAILY_QUERY_LIMIT = DAILY_COPILOT_QUERY_LIMIT;

function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}
const DAILY_LIMIT_MESSAGE =
  '⚠️ Daily limit reached. You have used your 5 free AI queries for today. Please return tomorrow!';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

const COMPRESSED_SCHEMA = "Table: _Subscribers\nFields: SubscriberID, DateUndeliverable, DateJoined, DateUnsubscribed, Domain, EmailAddress, BounceCount, SubscriberKey, SubscriberType, Status, Locale, (Profile Attributes)\n\nTable: _EnterpriseAttribute\nFields: _SubscriberID, (Your Attribute Columns)\n\nTable: _ListSubscribers\nFields: AddedBy, AddMethod, CreatedDate, DateUnsubscribed, EmailAddress, ListID, ListName, ListType, Status, SubscriberID, SubscriberKey, SubscriberType\n\nTable: _BusinessUnitUnsubscribes\nFields: BusinessUnitID, SubscriberID, SubscriberKey, UnsubDateUTC, UnsubReason\n\nTable: _Unsubscribe\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, IsUnique\n\nTable: _Job\nFields: JobID, EmailID, AccountID, AccountUserID, FromName, FromEmail, SchedTime, PickupTime, DeliveredTime, EventID, IsMultipart, JobType, JobStatus, ModifiedBy, ModifiedDate, EmailName, EmailSubject, IsWrapped, TestEmailAddr, Category, BccEmail, OriginalSchedTime, CreatedDate, CharacterSet, IPAddress, SalesForceTotalSubscriberCount, SalesForceErrorSubscriberCount, SendType, DynamicEmailSubject, SuppressTracking, SendClassificationType, SendClassification, ResolveLinksWithCurrentData, EmailSendDefinition, DeduplicateByEmail, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey\n\nTable: _Sent\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, (Profile Attributes)\n\nTable: _ReconcilableDispositionView\nFields: JobId, Channel, Disposition, MessageKey, SubscriberKey, SubscriberID, ErrorCodeID, ErrorName, ErrorDescription, StartTime\n\nTable: _Open\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, IsUnique, (Profile Attributes)\n\nTable: _Click\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, URL, LinkName, LinkContent, IsUnique, (Profile Attributes)\n\nTable: _Bounce\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, IsUnique, BounceCategoryID, BounceCategory, BounceSubcategoryID, BounceSubcategory, BounceTypeID, BounceType, SMTPBounceReason, SMTPMessage, SMTPCode, IsFalseBounce\n\nTable: _Complaint\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, IsUnique\n\nTable: _FTAF\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, TransactionTime, Domain, IsUnique, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey\n\nTable: _SurveyResponse\nFields: AccountID, OYBAccountID, JobID, ListID, BatchID, SubscriberID, SubscriberKey, EventDate, Domain, TriggererSendDefinitionObjectID, TriggeredSendCustomerKey, SurveyID, SurveyName, IsUnique, QuestionID, QuestionName, Question, AnswerID, AnswerName, Answer, AnswerData\n\nTable: _Journey\nFields: VersionID, JourneyID, JourneyName, VersionNumber, CreatedDate, LastPublishedDate, ModifiedDate, JourneyStatus\n\nTable: _JourneyActivity\nFields: VersionID, ActivityID, ActivityName, ActivityExternalKey, JourneyActivityObjectID, ActivityType\n\nTable: _AutomationInstance\nFields: MemberID, AutomationName, AutomationDescription, AutomationCustomerKey, AutomationInstanceID, AutomationType, AutomationNotificationRecipient_Complete, AutomationNotificationRecipient_Error, AutomationNotificationRecipient_Skip, AutomationStepCount, AutomationInstanceIsRunOnce, FilenameFromTrigger, AutomationInstanceScheduledTime_UTC, AutomationInstanceStartTime_UTC, AutomationInstanceEndTime_UTC, AutomationInstanceStatus, AutomationInstanceActivityErrorDetails\n\nTable: _AutomationActivityInstance\nFields: MemberID, JobID, AutomationName, AutomationCustomerKey, AutomationInstanceID, ActivityCustomerKey, ActivityInstanceID, ActivityType, ActivityName, ActivityDescription, ActivityInstanceStep, ActivityInstanceStartTime_UTC, ActivityInstanceEndTime_UTC, ActivityInstanceStatus, ActivityInstanceStatusDetails\n\nTable: _SMSMessageTracking\nFields: MobileMessageTrackingID, EID, MID, Mobile, MessageID, KeywordID, CodeID, ConversationID, ConversationStateID, CampaignID, Sent, Delivered, Undelivered, Outbound, Inbound, CreateDateTime, ModifiedDateTime, ActionDateTime, MessageText, IsTest, MobileMessageRecurrenceID, ResponseToMobileMessageTrackingID, IsValid, InvalidationCode, SendID, SendSplitID, SendSegmentID, SendJobID, SendGroupID, SendPersonID, SubscriberID, SubscriberKey, SMSStandardStatusCodeId, Description, Name, ShortCode, SharedKeyword, Ordinal, FromName, JBDefinitionID, JBActivityID, SMSJobID, SMSBatchID\n\nTable: _SMSSubscriptionLog\nFields: LogDate, SubscriberKey, MobileSubscriptionID, SubscriptionDefinitionID, MobileNumber, OptOutStatusID, OptOutMethodID, OptOutDate, OptInStatusID, OptInMethodID, OptInDate, Source, CreatedDate, ModifiedDate\n\nTable: _UndeliverableSMS\nFields: MobileNumber, Undeliverable, BounceCount, FirstBounceDate, HoldDate\n\nTable: _MobileAddress\nFields: _MobileID, _ContactID, _MobileNumber, _Status, _Source, _SourceObjectId, _Priority, _Channel, _CarrierID, _CountryCode, _CreatedDate, _CreatedBy, _ModifiedBy, _City, _State, _ZipCode, _FirstName, _LastName, _UTCOffset, _IsHonorDST\n\nTable: _PushAddress\nFields: DeviceID, SubscriberID, SubscriberKey, DeviceType, SystemToken, OptInStatus, OptInDate, OptOutDate, CreatedDate, ModifiedDate, ApplicationID, ContactID, Platform, PlatformVersion, HardwareId, Badge, LocationEnabled, TimeZone, Source, Status\n\nTable: _PushTag\nFields: DeviceID, TagName, CreatedDate, ModifiedDate, Source, Active\n\nTable: _MobileLineAddressContactSubscriptionView\nFields: ChannelID, ContactID, ContactKey, AddressID, IsActive, CreatedDate, ModifiedDate\n\nTable: _MobileLineOrphanContactView\nFields: ContactID, ContactKey, AddressID, CreatedDate\n\nTable: _SocialNetworkImpressions\nFields: JobID, ListID, RegionTitle, RegionDescription, RegionHTML, ContentRegionID, SocialSharingSiteID, SiteName, CountryCode, ReferringURL, IPAddress, TransactionTime, PublishedSocialContentStatusID, ShortCode, PublishTime\n\nTable: _SocialNetworkTracking\nFields: SubscriberID, SubscriberKey, ListID, BatchID, SocialSharingSiteID, SiteName, CountryCode, PublishedSocialContentID, RegionTitle, RegionDescription, RegionHTML, ContentRegionID, OYBMemberID, TransactionTime, IsUnique, Domain, PublishedSocialContentStatusID, ShortCode, PublishTime\n\nTable: _Coupon\nFields: Name, ExternalKey, Description, BeginDate, ExpirationDate";

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
  return process.env.OPENAI_API_KEY?.trim();
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
): Promise<{ user: { id: string } } | { error: Response }> {
  if (!isPlausibleJwt(accessToken)) {
    console.error('[api/chat] Rejected request: malformed JWT structure');
    return { error: jsonError('Unauthorized: invalid or expired session', 401) };
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
      return { error: jsonError('Unauthorized: invalid or expired session', 401) };
    }

    return { user };
  } catch (authFailure) {
    const message =
      authFailure instanceof Error ? authFailure.message : 'Token verification failed';
    console.error('[api/chat] Auth verification threw unexpectedly', message);
    return { error: jsonError('Unauthorized: invalid or expired session', 401) };
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
    console.error('[api/chat] Rejected request: missing or unreadable Authorization Bearer token');
    return jsonError('Unauthorized: valid Bearer token required', 401);
  }

  const authResult = await resolveAuthenticatedUser(supabase, accessToken);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

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

  let usageReservation: UsageReservation;
  try {
    usageReservation = await reserveCopilotUsageSlot(user.id);
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to check daily usage limit';
    console.error('[api/chat] Rejected request: usage reservation failed', message);
    return jsonError(`Usage verification failed: ${message}`, 503);
  }

  if (!usageReservation.ok) {
    return streamSseContent(DAILY_LIMIT_MESSAGE);
  }

  const reservedUsageRowId = usageReservation.usageRowId;

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
    await releaseCopilotUsageSlot(reservedUsageRowId);
    const message =
      error instanceof Error ? error.message : 'Failed to start OpenAI completion stream';
    return jsonError(message, 502);
  }

  const encoder = new TextEncoder();
  const latestUserPrompt = getLatestUserPrompt(clientMessages);

  const sseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulatedAssistantText = '';

      try {
        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) {
            continue;
          }

          accumulatedAssistantText += delta;
          const payload = JSON.stringify({ content: delta });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

        await logConversationAnalytics(user.id, latestUserPrompt, accumulatedAssistantText);

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (streamError) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }

        await releaseCopilotUsageSlot(reservedUsageRowId);

        const message =
          streamError instanceof Error
            ? streamError.message
            : 'Stream interrupted while reading OpenAI response';

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

export default handleChatRequest;
