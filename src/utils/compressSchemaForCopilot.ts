import {
  sendLogDataViews,
  sfmcDataViews,
  synchronizedDeDataViews,
} from '../data/sfmcSchema.js';
import type { DataViewField, DataViewTable } from '../data/schemas/types.js';

/** All workspace segments — core system views, SendLog templates, and synchronized CRM DEs. */
const ALL_COPILOT_WORKSPACE_TABLES: readonly DataViewTable[] = [
  ...sfmcDataViews,
  ...sendLogDataViews,
  ...synchronizedDeDataViews,
];

const VALID_TABLE_NAMES = new Set(ALL_COPILOT_WORKSPACE_TABLES.map((table) => table.name));
const TABLE_BY_NAME = new Map(
  ALL_COPILOT_WORKSPACE_TABLES.map((table) => [table.name, table]),
);

/** Max active tables that receive the full field matrix before summarization kicks in. */
const ACTIVE_TABLE_FULL_DETAIL_CAP = 4;

function formatFieldType(field: DataViewField): string {
  if (field.length !== undefined) {
    return `${field.type}(${field.length})`;
  }
  return field.type;
}

function formatFieldLine(field: DataViewField): string {
  const flags = [
    field.isPrimaryKey ? 'PK' : null,
    field.isNullable ? 'NULL' : 'NOT NULL',
  ]
    .filter(Boolean)
    .join(', ');

  const relations = field.relatesTo
    ?.map((rel) => `${rel.field} -> ${rel.table}.${rel.field}`)
    .join('; ');

  const relationSuffix = relations ? ` | relates: ${relations}` : '';

  return `  - ${field.name} | ${formatFieldType(field)} | ${flags}${relationSuffix} | ${field.description}`;
}

/**
 * Full field matrix for a single data view (types, keys, relations, descriptions).
 */
export function buildDetailedTableContext(table: DataViewTable): string {
  const fieldLines = table.fields.map(formatFieldLine);

  return [
    `Table: ${table.name}`,
    `Category: ${table.category}`,
    `Description: ${table.description}`,
    'Fields:',
    ...fieldLines,
  ].join('\n');
}

/**
 * Primary-key-focused summary for token-efficient active-table context.
 */
export function buildSummarizedTableContext(table: DataViewTable): string {
  const pkLines = table.fields
    .filter((field) => field.isPrimaryKey)
    .map((field) => {
      const relations = field.relatesTo
        ?.map((rel) => `${rel.field} -> ${rel.table}.${rel.field}`)
        .join('; ');
      const relationSuffix = relations ? ` | relates: ${relations}` : '';
      return `  - ${field.name}${relationSuffix}`;
    });

  return [
    `Table: ${table.name}`,
    `Category: ${table.category}`,
    `Description: ${table.description}`,
    'Primary Keys:',
    ...(pkLines.length > 0 ? pkLines : ['  (none documented)']),
  ].join('\n');
}

/**
 * Serializes canvas schema tables into the compact "Table / Fields" text block
 * injected into the AI Copilot system prompt when no canvas tables are selected.
 */
export function buildCompressedSchemaContext(tables: readonly DataViewTable[]): string {
  return tables
    .map((table) => {
      const fieldNames = table.fields.map((field) => field.name).join(', ');
      return `Table: ${table.name}\nFields: ${fieldNames}`;
    })
    .join('\n\n');
}

/** Pre-built schema context from the same source array as the frontend canvas. */
export const copilotCompressedSchemaContext = buildCompressedSchemaContext(sfmcDataViews);

/**
 * Parses and deduplicates active table names from the chat request body.
 * Unknown or malformed entries are dropped.
 */
export function normalizeActiveTableNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') {
      continue;
    }

    const name = entry.trim();
    if (!name || !VALID_TABLE_NAMES.has(name) || seen.has(name)) {
      continue;
    }

    seen.add(name);
    result.push(name);
  }

  return result;
}

/**
 * Builds Copilot schema context from canvas selection:
 * - Active tables (≤4): full field matrix for each
 * - Active tables (>4): full matrix for the first 4, PK summary for the rest
 * - All others: names-only auxiliary index across every workspace segment
 * Falls back to global compressed schema when selection is empty.
 */
export function buildDynamicCopilotSchemaContext(activeTableNames: readonly string[]): string {
  const activeNames = normalizeActiveTableNames(activeTableNames);

  if (activeNames.length === 0) {
    return copilotCompressedSchemaContext;
  }

  const activeSet = new Set(activeNames);
  const resolvedActiveTables = activeNames
    .map((name) => TABLE_BY_NAME.get(name))
    .filter((table): table is DataViewTable => table !== undefined);

  const fullDetailTables = resolvedActiveTables.slice(0, ACTIVE_TABLE_FULL_DETAIL_CAP);
  const summarizedTables = resolvedActiveTables.slice(ACTIVE_TABLE_FULL_DETAIL_CAP);

  const sections: string[] = [];

  if (fullDetailTables.length > 0) {
    sections.push(
      'Active Canvas Tables (full field matrix — prioritize these in SQL):',
      fullDetailTables.map(buildDetailedTableContext).join('\n\n'),
    );
  }

  if (summarizedTables.length > 0) {
    sections.push(
      '',
      `Additional Active Canvas Tables (primary keys only — ${summarizedTables.length} beyond the ${ACTIVE_TABLE_FULL_DETAIL_CAP}-table detail cap):`,
      summarizedTables.map(buildSummarizedTableContext).join('\n\n'),
    );
  }

  const auxiliaryNames = ALL_COPILOT_WORKSPACE_TABLES.map((table) => table.name).filter(
    (name) => !activeSet.has(name),
  );

  if (auxiliaryNames.length > 0) {
    sections.push(
      '',
      'Available Auxiliary Tables (names only — select on canvas or mention in chat for full fields):',
      auxiliaryNames.join(', '),
    );
  }

  return sections.join('\n');
}
