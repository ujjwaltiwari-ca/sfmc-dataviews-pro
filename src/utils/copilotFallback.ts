import { sfmcDataViews } from '../data/sfmcSchema';
import {
  applySqlKeywordCase,
  applySqlUtilityFilters,
  generateSfmcSql,
} from './sqlGenerator';

const KNOWN_TABLE_NAMES = new Set(sfmcDataViews.map((table) => table.name));

const TABLE_SIGNALS: { pattern: RegExp; table: string }[] = [
  { pattern: /\b_subscribers\b/i, table: '_Subscribers' },
  { pattern: /\bsubscribers?\b/i, table: '_Subscribers' },
  { pattern: /\b_job\b|\bjob\s*ids?\b/i, table: '_Job' },
  { pattern: /\b_sent\b|\bsent\b|\bsends?\b/i, table: '_Sent' },
  { pattern: /\b_open\b|\bopens?\b/i, table: '_Open' },
  { pattern: /\b_click\b|\bclicks?\b/i, table: '_Click' },
  { pattern: /\b_bounce\b|\bbounces?\b/i, table: '_Bounce' },
  { pattern: /\b_journey\b|\bjourneys?\b/i, table: '_Journey' },
  { pattern: /\bunsubscribes?\b/i, table: '_Unsubscribe' },
  { pattern: /\b_complaint\b|\bcomplaints?\b/i, table: '_Complaint' },
];

const SQL_INTENT_PATTERN =
  /\b(sql|query|queries|select|join|joins|generate|write|build|create|compile|show\s+me|get\s+me|list|pull|extract)\b/i;

const OFFLINE_INTRO =
  'Google Gemini is currently experiencing high demand on the free tier. However, based on your request, here is an optimized schema query built directly by our local SFMC compilation engine:';

const OFFLINE_GENERIC =
  'Google Gemini is temporarily unavailable (free-tier rate limits or a network issue). Try again shortly, or ask for SQL using data view names like _Open, _Sent, or _Job — our local SFMC compilation engine can still build the query offline.';

export function isSqlQueryIntent(query: string): boolean {
  if (SQL_INTENT_PATTERN.test(query)) {
    return true;
  }
  return inferTablesFromQuery(query).length > 0;
}

export function inferTablesFromQuery(query: string): string[] {
  const tables = new Set<string>();

  for (const match of query.matchAll(/_\w+/g)) {
    const name = match[0];
    if (KNOWN_TABLE_NAMES.has(name)) {
      tables.add(name);
    }
  }

  const lowered = query.toLowerCase();
  for (const { pattern, table } of TABLE_SIGNALS) {
    if (pattern.test(lowered)) {
      tables.add(table);
    }
  }

  if (tables.size === 0 && /\b(email|campaign|performance|engagement|tracking)\b/i.test(query)) {
    tables.add('_Sent');
    tables.add('_Open');
  }

  return [...tables];
}

function buildFallbackSql(query: string, tableNames: string[]): string | null {
  const generation = generateSfmcSql(tableNames, sfmcDataViews);
  if (generation.isEmpty || generation.baseSql.startsWith('--')) {
    return null;
  }

  const limitPast30Days = /\b(30\s*days?|last\s*30|past\s*30|past\s*month)\b/i.test(query);
  const excludeTestSends = /\btest\s*sends?\b/i.test(query);
  const filterActiveSubscribersOnly = /\bactive\s*subscribers?\b/i.test(query);

  let sql = applySqlUtilityFilters(
    generation.baseSql,
    {
      limitPast30Days,
      excludeTestSends,
      filterActiveSubscribersOnly,
    },
    generation.filterAlias,
    'upper',
  );

  sql = applySqlKeywordCase(sql, 'upper');
  return sql;
}

/** Assistant message with a fenced SQL block for Apply-to-Sandbox, or a friendly offline-only reply. */
export function buildLocalFallbackReply(query: string): string {
  if (!isSqlQueryIntent(query)) {
    return OFFLINE_GENERIC;
  }

  const tableNames = inferTablesFromQuery(query);
  if (tableNames.length === 0) {
    return OFFLINE_GENERIC;
  }

  const sql = buildFallbackSql(query, tableNames);
  if (!sql) {
    return OFFLINE_GENERIC;
  }

  return `${OFFLINE_INTRO}\n\n\`\`\`sql\n${sql}\n\`\`\``;
}

export function logCopilotApiError(error: unknown): void {
  if (error instanceof Error) {
    console.error('[AiCopilot] Gemini request failed:', error.name, error.message, error);
    return;
  }
  console.error('[AiCopilot] Gemini request failed:', error);
}
