import { sfmcDataViews } from '../data/sfmcSchema';

const KNOWN_TABLE_NAMES = new Set(sfmcDataViews.map((table) => table.name));

/** Extracts SFMC data view names referenced in FROM/JOIN clauses. */
export function extractTablesFromSql(sql: string): string[] {
  const pattern = /\b(?:FROM|JOIN)\s+(?:Ent\.)?(_\w+|SendLog)\b/gi;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of sql.matchAll(pattern)) {
    const name = match[1];
    if (!name || !KNOWN_TABLE_NAMES.has(name) || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }

  return result;
}
