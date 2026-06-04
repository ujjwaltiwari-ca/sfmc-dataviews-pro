import type { Completion } from '@codemirror/autocomplete';
import type { DataViewTable } from '../data/sfmcSchema';

/** CodeMirror @codemirror/lang-sql schema map: table name → column completions. */
export type SqlEditorCompletionSchema = Record<string, readonly Completion[]>;

const columnCompletion = (name: string): Completion => ({
  label: name,
  type: 'property',
});

/** SFMC Query Activity uses T-SQL-style date functions (not in Standard SQL). */
export const SFMC_SQL_FUNCTION_COMPLETIONS: readonly Completion[] = [
  { label: 'GETDATE', type: 'function', apply: 'GETDATE()' },
  {
    label: 'DATEADD',
    type: 'function',
    apply: 'DATEADD(day, ',
    detail: 'DATEADD(datepart, number, date)',
  },
];

/**
 * Builds table/column completions for the SQL sandbox editor from SFMC schema data.
 * Only includes tables present in `tableNames` (e.g. Pathfinder join graph).
 *
 * Uses explicit Completion objects so PascalCase names (e.g. EventDate) are not
 * auto-wrapped in double quotes.
 */
export function buildSqlCompletionSchema(
  schemaTables: readonly DataViewTable[],
  tableNames: readonly string[],
): SqlEditorCompletionSchema {
  if (tableNames.length === 0) {
    return {};
  }

  const nameSet = new Set(tableNames);
  const result: Record<string, Completion[]> = {};

  for (const table of schemaTables) {
    if (!nameSet.has(table.name)) {
      continue;
    }
    const columns = table.fields.map((field) => columnCompletion(field.name));
    result[table.name] = columns;
    // CodeMirror's SQL lexer splits `_Sent` into "_" + `Sent`, so alias paths use `Sent`.
    if (table.name.startsWith('_')) {
      const parserTableName = table.name.slice(1);
      if (!(parserTableName in result)) {
        result[parserTableName] = columns;
      }
    }
  }

  return result;
}
