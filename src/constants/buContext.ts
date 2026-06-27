export type BuContextMode = 'child' | 'enterprise';

export const BU_CONTEXT_STORAGE_KEY = 'sfmc-bu-context';

export function readBuContextPreference(): BuContextMode {
  try {
    const stored = localStorage.getItem(BU_CONTEXT_STORAGE_KEY);
    if (stored === 'enterprise') {
      return 'enterprise';
    }
  } catch {
    /* ignore */
  }
  return 'child';
}

export function writeBuContextPreference(mode: BuContextMode): void {
  try {
    localStorage.setItem(BU_CONTEXT_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** System data views (leading underscore) qualify for Ent. prefix in enterprise mode. */
export function isEnterprisePrefixedTable(tableName: string): boolean {
  return tableName.startsWith('_');
}

export function qualifySqlTableName(
  tableName: string,
  enterpriseBuMode: boolean,
): string {
  if (enterpriseBuMode && isEnterprisePrefixedTable(tableName)) {
    return `Ent.${tableName}`;
  }
  return tableName;
}
