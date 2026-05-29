import { sfmcDataViews } from '../data/sfmcSchema';
import {
  applySqlKeywordCase,
  applySqlUtilityFilters,
  generateSfmcSql,
} from './sqlGenerator';

/** Loose substring needles → SFMC data view (order: longer/specific checks are not required). */
const LOOSE_TABLE_SIGNALS: readonly { needle: string; table: string }[] = [
  { needle: 'open', table: '_Open' },
  { needle: 'sent', table: '_Sent' },
  { needle: 'send', table: '_Sent' },
  { needle: 'click', table: '_Click' },
  { needle: 'sub', table: '_Subscribers' },
  { needle: 'job', table: '_Job' },
  { needle: 'bounce', table: '_Bounce' },
];

const BASELINE_TRACKING_TABLES = ['_Open', '_Sent'] as const;

const SQL_INTENT_PATTERN =
  /\b(sql|query|queries|select|join|joins|generate|write|build|create|compile|show|get|list|pull|extract|dataview|data\s*view)\b/i;

const OFFLINE_GENERIC =
  'OpenAI is temporarily unavailable (network or API issue). Try again shortly, or ask for a query mentioning opens, sends, clicks, or jobs — our local compiler will build the SQL offline.';

const OFFLINE_SQL_INTRO =
  'OpenAI is temporarily unavailable, but our local SFMC compiler successfully generated your requested Salesforce Marketing Cloud query:';

export function inferTablesFromQuery(query: string): string[] {
  const lowered = query.toLowerCase();
  const tables = new Set<string>();

  for (const table of sfmcDataViews) {
    if (lowered.includes(table.name.toLowerCase())) {
      tables.add(table.name);
    }
  }

  for (const { needle, table } of LOOSE_TABLE_SIGNALS) {
    if (lowered.includes(needle)) {
      tables.add(table);
    }
  }

  return [...tables];
}

export function isSqlQueryIntent(query: string): boolean {
  return SQL_INTENT_PATTERN.test(query) || inferTablesFromQuery(query).length > 0;
}

function resolveTablesForFallback(query: string): string[] {
  const detected = inferTablesFromQuery(query);
  if (detected.length > 0) {
    return detected;
  }
  if (isSqlQueryIntent(query)) {
    return [...BASELINE_TRACKING_TABLES];
  }
  return [];
}

function parseDayFilter(query: string): number | null {
  const match = query.match(/(\d+)\s*day/i);
  if (!match) {
    return null;
  }
  const days = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(days) && days > 0 ? days : null;
}

function appendEventDatePredicate(
  baseSql: string,
  days: number,
  filterAlias: string | null,
): string {
  const column = filterAlias ? `${filterAlias}.EventDate` : 'EventDate';
  const predicate = `${column} >= DATEADD(day, -${days}, GETDATE())`;
  const whereMatch = baseSql.match(/\nWHERE\s+([\s\S]*?)(?=\n--|\n*$)/i);

  if (whereMatch) {
    const existing = whereMatch[1].trim();
    return baseSql.replace(whereMatch[0], `\nWHERE ${existing}\n  AND ${predicate}`);
  }

  return `${baseSql}\nWHERE ${predicate}`;
}

function buildFallbackSql(query: string, tableNames: string[]): string | null {
  const generation = generateSfmcSql(tableNames, sfmcDataViews);
  if (generation.isEmpty || generation.baseSql.startsWith('--')) {
    return null;
  }

  const dayCount = parseDayFilter(query);
  const excludeTestSends = /\btest\s*sends?\b/i.test(query);
  const filterActiveSubscribersOnly = /\bactive\s*subscribers?\b/i.test(query);

  let sql = generation.baseSql;

  if (excludeTestSends || filterActiveSubscribersOnly) {
    sql = applySqlUtilityFilters(
      sql,
      {
        limitPast30Days: false,
        excludeTestSends,
        filterActiveSubscribersOnly,
      },
      generation.filterAlias,
      'upper',
    );
  }

  if (dayCount !== null) {
    sql = appendEventDatePredicate(sql, dayCount, generation.filterAlias);
  }

  return applySqlKeywordCase(sql, 'upper');
}

function formatOfflineSqlReply(sql: string): string {
  const trimmed = sql.trim();
  return `${OFFLINE_SQL_INTRO}\n\n\`\`\`sql\n${trimmed}\n\`\`\``;
}

/** Assistant message with a fenced SQL block for Apply-to-Sandbox, or a friendly offline-only reply. */
export function buildLocalFallbackReply(query: string): string {
  const tableNames = resolveTablesForFallback(query);
  if (tableNames.length === 0) {
    return OFFLINE_GENERIC;
  }

  const sql = buildFallbackSql(query, tableNames);
  if (!sql) {
    return OFFLINE_GENERIC;
  }

  return formatOfflineSqlReply(sql);
}

export function logCopilotApiError(error: unknown): void {
  if (error instanceof Error) {
    console.error('[AiCopilot] OpenAI request failed:', error.name, error.message, error);
    return;
  }
  console.error('[AiCopilot] OpenAI request failed:', error);
}
