/** Strips non-numeric characters for SFMC numeric identifiers (e.g. JobID). */
export function sanitizeNumericSqlLiteral(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/** Escapes single quotes for SQL string literals. */
export function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
