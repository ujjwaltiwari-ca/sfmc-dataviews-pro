export const MAX_QUERY_SLOTS = 3;

export type QuerySlot = {
  label: string;
  tableNames: string[];
  sql: string;
};

export type QuerySlotsState = {
  slots: QuerySlot[];
  activeIndex: number;
};

const STORAGE_KEY = 'sfmc-query-slots-v1';

export const DEFAULT_SLOT_LABELS = ['Query 1', 'Query 2', 'Query 3'] as const;

export function createDefaultSlots(
  seed?: Partial<Pick<QuerySlot, 'tableNames' | 'sql'>>,
): QuerySlot[] {
  return DEFAULT_SLOT_LABELS.map((label, index) => ({
    label,
    tableNames: index === 0 ? (seed?.tableNames ?? []) : [],
    sql: index === 0 ? (seed?.sql ?? '') : '',
  }));
}

export function hydrateQuerySlots(seed?: Partial<Pick<QuerySlot, 'tableNames' | 'sql'>>): QuerySlotsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { slots: createDefaultSlots(seed), activeIndex: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<QuerySlotsState>;
    if (!Array.isArray(parsed.slots) || parsed.slots.length !== MAX_QUERY_SLOTS) {
      return { slots: createDefaultSlots(seed), activeIndex: 0 };
    }
    const slots = parsed.slots.map((slot, index) => ({
      label:
        typeof slot?.label === 'string' && slot.label.trim()
          ? slot.label.trim().slice(0, 40)
          : DEFAULT_SLOT_LABELS[index],
      tableNames: Array.isArray(slot?.tableNames)
        ? slot.tableNames.filter((name): name is string => typeof name === 'string')
        : [],
      sql: typeof slot?.sql === 'string' ? slot.sql : '',
    }));
    const activeIndex =
      typeof parsed.activeIndex === 'number' &&
      parsed.activeIndex >= 0 &&
      parsed.activeIndex < MAX_QUERY_SLOTS
        ? parsed.activeIndex
        : 0;
    if (
      seed &&
      slots[0].tableNames.length === 0 &&
      slots[0].sql === '' &&
      ((seed.tableNames?.length ?? 0) > 0 || (seed.sql?.length ?? 0) > 0)
    ) {
      slots[0] = {
        ...slots[0],
        tableNames: seed.tableNames ?? [],
        sql: seed.sql ?? '',
      };
    }
    return { slots, activeIndex };
  } catch {
    return { slots: createDefaultSlots(seed), activeIndex: 0 };
  }
}

export function persistQuerySlots(state: QuerySlotsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
