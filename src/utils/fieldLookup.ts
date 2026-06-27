import type { DataViewField, DataViewTable } from '../data/sfmcSchema';

export const FIELD_LOOKUP_PREFIX = 'field:';

export type FieldLookupResult = {
  tableName: string;
  field: DataViewField;
  category: DataViewTable['category'];
};

export function parseFieldLookupQuery(searchQuery: string): string | null {
  const trimmed = searchQuery.trim();
  if (!trimmed.toLowerCase().startsWith(FIELD_LOOKUP_PREFIX)) {
    return null;
  }
  const term = trimmed.slice(FIELD_LOOKUP_PREFIX.length).trim();
  return term.length > 0 ? term : null;
}

export function isFieldLookupMode(searchQuery: string): boolean {
  return parseFieldLookupQuery(searchQuery) !== null;
}

export function searchFieldsAcrossTables(
  tables: readonly DataViewTable[],
  fieldTerm: string,
): FieldLookupResult[] {
  const normalized = fieldTerm.toLowerCase();
  const results: FieldLookupResult[] = [];

  for (const table of tables) {
    for (const field of table.fields) {
      if (field.name.toLowerCase().includes(normalized)) {
        results.push({
          tableName: table.name,
          field,
          category: table.category,
        });
      }
    }
  }

  return results.sort((a, b) => {
    const aExact = a.field.name.toLowerCase() === normalized ? 0 : 1;
    const bExact = b.field.name.toLowerCase() === normalized ? 0 : 1;
    if (aExact !== bExact) {
      return aExact - bExact;
    }
    return a.tableName.localeCompare(b.tableName);
  });
}
