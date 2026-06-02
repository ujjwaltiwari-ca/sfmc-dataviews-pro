import { sfmcDataViews } from '../data/sfmcSchema';
import type { DataViewField, DataViewTable } from '../data/schemas/types';

const VALID_TABLE_NAMES = new Set(sfmcDataViews.map((table) => table.name));
const TABLE_BY_NAME = new Map(sfmcDataViews.map((table) => [table.name, table]));

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
 * Serializes canvas schema tables into the compact "Table / Fields" text block
 * injected into the AI Copilot system prompt (kept in sync with sfmcDataViews).
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
 * - Active tables: full field matrix
 * - All others: names-only auxiliary index
 * Falls back to global compressed schema when selection is empty.
 */
export function buildDynamicCopilotSchemaContext(activeTableNames: readonly string[]): string {
  const activeNames = normalizeActiveTableNames(activeTableNames);

  if (activeNames.length === 0) {
    return copilotCompressedSchemaContext;
  }

  const activeSet = new Set(activeNames);

  const detailedBlocks = activeNames
    .map((name) => TABLE_BY_NAME.get(name))
    .filter((table): table is DataViewTable => table !== undefined)
    .map(buildDetailedTableContext);

  const auxiliaryNames = sfmcDataViews
    .map((table) => table.name)
    .filter((name) => !activeSet.has(name));

  const sections = [
    'Active Canvas Tables (full field matrix — prioritize these in SQL):',
    detailedBlocks.join('\n\n'),
  ];

  if (auxiliaryNames.length > 0) {
    sections.push(
      '',
      'Available Auxiliary Tables (names only — select on canvas or mention in chat for full fields):',
      auxiliaryNames.join(', '),
    );
  }

  return sections.join('\n');
}
