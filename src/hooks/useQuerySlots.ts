import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SLOT_LABELS,
  hydrateQuerySlots,
  MAX_QUERY_SLOTS,
  persistQuerySlots,
  type QuerySlot,
  type QuerySlotsState,
} from '../utils/querySlots';

export type QuerySlotsApi = {
  activeIndex: number;
  slots: QuerySlot[];
  activeSlot: QuerySlot;
  switchSlot: (index: number) => void;
  renameSlot: (index: number, label: string) => void;
  updateActiveSlot: (patch: Partial<Pick<QuerySlot, 'tableNames' | 'sql' | 'label'>>) => void;
};

type UseQuerySlotsOptions = {
  tableNames: string[];
  sql: string;
  onApplySlot: (slot: QuerySlot) => void;
};

export function useQuerySlots({ tableNames, sql, onApplySlot }: UseQuerySlotsOptions): QuerySlotsApi {
  const [state, setState] = useState<QuerySlotsState>(() =>
    hydrateQuerySlots({ tableNames, sql }),
  );
  const isSwitchingRef = useRef(false);
  const onApplySlotRef = useRef(onApplySlot);
  onApplySlotRef.current = onApplySlot;

  const activeSlot = state.slots[state.activeIndex];

  const flushActiveSlot = useCallback(
    (currentTables: string[], currentSql: string, base: QuerySlotsState): QuerySlotsState => {
      const slots = [...base.slots];
      slots[base.activeIndex] = {
        ...slots[base.activeIndex],
        tableNames: currentTables,
        sql: currentSql,
      };
      return { ...base, slots };
    },
    [],
  );

  useEffect(() => {
    if (isSwitchingRef.current) {
      return;
    }
    setState((previous) => {
      const current = previous.slots[previous.activeIndex];
      if (
        current.tableNames.join(',') === tableNames.join(',') &&
        current.sql === sql
      ) {
        return previous;
      }
      const next = flushActiveSlot(tableNames, sql, previous);
      persistQuerySlots(next);
      return next;
    });
  }, [tableNames, sql, flushActiveSlot]);

  const switchSlot = useCallback(
    (index: number) => {
      if (index < 0 || index >= MAX_QUERY_SLOTS || index === state.activeIndex) {
        return;
      }
      isSwitchingRef.current = true;
      setState((previous) => {
        const flushed = flushActiveSlot(tableNames, sql, previous);
        const next = { ...flushed, activeIndex: index };
        persistQuerySlots(next);
        onApplySlotRef.current(next.slots[index]);
        return next;
      });
      window.requestAnimationFrame(() => {
        isSwitchingRef.current = false;
      });
    },
    [flushActiveSlot, sql, state.activeIndex, tableNames],
  );

  const renameSlot = useCallback((index: number, label: string) => {
    const trimmed = label.trim().slice(0, 40) || DEFAULT_SLOT_LABELS[index];
    setState((previous) => {
      const slots = [...previous.slots];
      slots[index] = { ...slots[index], label: trimmed };
      const next = { ...previous, slots };
      persistQuerySlots(next);
      return next;
    });
  }, []);

  const updateActiveSlot = useCallback(
    (patch: Partial<Pick<QuerySlot, 'tableNames' | 'sql' | 'label'>>) => {
      setState((previous) => {
        const slots = [...previous.slots];
        slots[previous.activeIndex] = { ...slots[previous.activeIndex], ...patch };
        const next = { ...previous, slots };
        persistQuerySlots(next);
        return next;
      });
    },
    [],
  );

  return {
    activeIndex: state.activeIndex,
    slots: state.slots,
    activeSlot,
    switchSlot,
    renameSlot,
    updateActiveSlot,
  };
}
