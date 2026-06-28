import { useCallback, useMemo, useState } from 'react';
import type { SandboxEditorTab } from '../utils/workspacePersistence';
import type { ViewSegmentId } from '../data/viewSegments';
import { buildSafeSqlPreferencePatch } from '../utils/safeSqlDefaults';
import {
  DEFAULT_SANDBOX_PREFERENCES,
  DEFAULT_WORKSPACE_SNAPSHOT,
  filterTableNamesForSegment,
  hydrateWorkspaceState,
  persistWorkspaceState,
  type SandboxPreferences,
} from '../utils/workspacePersistence';

export type WorkspaceStateApi = {
  segment: ViewSegmentId;
  setSegment: (segment: ViewSegmentId) => void;
  selectedTableNames: string[];
  selectedTables: Set<string>;
  setSelectedTableNames: (names: string[]) => void;
  toggleTableSelection: (tableName: string) => void;
  showSandbox: boolean;
  setShowSandbox: (open: boolean) => void;
  sandboxPreferences: SandboxPreferences;
  updateSandboxPreferences: (patch: Partial<SandboxPreferences>) => void;
  isSandboxExpanded: boolean;
  setIsSandboxExpanded: (expanded: boolean) => void;
  activeTemplateId: string | null;
  setActiveTemplateId: (templateId: string | null) => void;
  editorTab: SandboxEditorTab;
  setEditorTab: (tab: SandboxEditorTab) => void;
  initialTemplateSql: string | null;
  initialSharedSql: string | null;
  hydrationSource: 'fresh-url' | 'storage' | 'url-or-storage';
  /** Clears selections, sandbox, share URL params, and persisted workspace keys. */
  resetWorkspace: () => void;
};

export function useWorkspaceState(): WorkspaceStateApi {
  const hydrated = useMemo(() => hydrateWorkspaceState(), []);

  const [segment, setSegmentState] = useState<ViewSegmentId>(hydrated.segment);
  const [selectedTableNames, setSelectedTableNamesState] = useState<string[]>(
    hydrated.selectedTableNames,
  );
  const [showSandbox, setShowSandbox] = useState(hydrated.showSandbox);
  const [sandboxPreferences, setSandboxPreferences] = useState<SandboxPreferences>(
    hydrated.sandboxPreferences,
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    hydrated.activeTemplateId,
  );

  const selectedTables = useMemo(
    () => new Set(selectedTableNames),
    [selectedTableNames],
  );

  const setSegment = useCallback((nextSegment: ViewSegmentId) => {
    setSegmentState(nextSegment);
    setSelectedTableNamesState((previous) => {
      const filtered = filterTableNamesForSegment(previous, nextSegment);
      if (
        filtered.length === previous.length &&
        filtered.every((name, index) => name === previous[index])
      ) {
        return previous;
      }
      return filtered;
    });
  }, []);

  const setSelectedTableNames = useCallback((names: string[]) => {
    const filtered = filterTableNamesForSegment(names, segment);
    setSelectedTableNamesState(filtered);
    setSandboxPreferences((previous) => ({
      ...previous,
      ...buildSafeSqlPreferencePatch(filtered, previous),
    }));
  }, [segment]);

  const updateSandboxPreferences = useCallback((patch: Partial<SandboxPreferences>) => {
    setSandboxPreferences((previous) => ({ ...previous, ...patch }));
  }, []);

  const toggleTableSelection = useCallback(
    (tableName: string) => {
      const valid = filterTableNamesForSegment([tableName], segment);
      if (valid.length === 0) {
        return;
      }

      const name = valid[0];
      const isSelecting = !selectedTableNames.includes(name);

      setSelectedTableNamesState((previous) => {
        const next = previous.includes(name)
          ? previous.filter((entry) => entry !== name)
          : [...previous, name];

        setSandboxPreferences((prefs) => ({
          ...prefs,
          ...buildSafeSqlPreferencePatch(next, prefs),
        }));

        return next;
      });

      if (isSelecting) {
        setShowSandbox(true);
        updateSandboxPreferences({ isSandboxExpanded: true });
      }
    },
    [segment, selectedTableNames, updateSandboxPreferences],
  );

  const setIsSandboxExpanded = useCallback(
    (expanded: boolean) => {
      updateSandboxPreferences({ isSandboxExpanded: expanded });
    },
    [updateSandboxPreferences],
  );

  const setEditorTab = useCallback(
    (tab: SandboxEditorTab) => {
      updateSandboxPreferences({ editorTab: tab });
      if (tab === 'live') {
        setActiveTemplateId(null);
      }
    },
    [updateSandboxPreferences],
  );

  const resetWorkspace = useCallback(() => {
    setSegmentState(DEFAULT_WORKSPACE_SNAPSHOT.segment);
    setSelectedTableNamesState([]);
    setShowSandbox(false);
    setActiveTemplateId(null);
    setSandboxPreferences({ ...DEFAULT_SANDBOX_PREFERENCES });
    persistWorkspaceState(DEFAULT_WORKSPACE_SNAPSHOT);
  }, []);


  return {
    segment,
    setSegment,
    selectedTableNames,
    selectedTables,
    setSelectedTableNames,
    toggleTableSelection,
    showSandbox,
    setShowSandbox,
    sandboxPreferences,
    updateSandboxPreferences,
    isSandboxExpanded: sandboxPreferences.isSandboxExpanded,
    setIsSandboxExpanded,
    activeTemplateId,
    setActiveTemplateId,
    editorTab: sandboxPreferences.editorTab,
    setEditorTab,
    initialTemplateSql: hydrated.initialTemplateSql,
    initialSharedSql: hydrated.initialSharedSql,
    hydrationSource: hydrated.source,
    resetWorkspace,
  };
}

export { DEFAULT_SANDBOX_PREFERENCES };
