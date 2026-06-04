import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './context/AuthContext';
import { AiCopilot } from './components/AiCopilot';
import { CanvasHero } from './components/CanvasHero';
import { CommandToolbar } from './components/CommandToolbar';
import { DataViewCard } from './components/DataViewCard';
import { Header } from './components/Header';
import { SchemaArchitectMark } from './components/SchemaArchitectMark';
import { SiteFooter } from './components/SiteFooter';
import {
  getDefaultSandboxHeight,
  SANDBOX_COLLAPSED_CHROME_HEIGHT_PX,
  SANDBOX_RESIZE_GUTTER_HEIGHT_PX,
  SqlGenerator,
} from './components/SqlGenerator';
import type { DataViewField } from './data/sfmcSchema';
import { dedupeTablesByName, getTablesForSegment } from './data/viewSegments';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { workspaceHasCustomState } from './utils/workspacePersistence';
import type { HoveredRelation } from './utils/schemaExplorer';
import { buildRelationHighlight, normalizeSearchQuery } from './utils/schemaExplorer';

const stagingPassword = import.meta.env.VITE_STAGING_PASSWORD?.trim();
const STAGING_UNLOCK_STORAGE_KEY = 'isStagingUnlocked';

const RELATION_LEAVE_DELAY_MS = 40;
const SHOW_DETAILS_STORAGE_KEY = 'sfmc-show-details';

function readShowDetailsPreference(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_DETAILS_STORAGE_KEY);
    if (stored === null) {
      return true;
    }
    return stored === 'true';
  } catch {
    return true;
  }
}

function readStagingUnlocked(): boolean {
  try {
    return localStorage.getItem(STAGING_UNLOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function isStagingGateActive(): boolean {
  return Boolean(stagingPassword);
}

function StagingGateScreen({
  onUnlock,
  onSubmitPassword,
}: {
  onUnlock: () => void;
  onSubmitPassword: (password: string) => boolean;
}) {
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (onSubmitPassword(passwordInput)) {
      try {
        localStorage.setItem(STAGING_UNLOCK_STORAGE_KEY, 'true');
      } catch {
        /* ignore storage errors */
      }
      onUnlock();
      return;
    }

    setError('Incorrect password. Please try again.');
    setPasswordInput('');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]"
        aria-hidden
      />

      <div className="relative w-full max-w-sm text-center">
        <SchemaArchitectMark className="mx-auto h-14 w-14 rounded-xl shadow-lg shadow-cyan-500/30 ring-1 ring-white/10" />

        <h1 className="mt-6 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
          <Lock className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          dataviews.pro — Pre-launch Verification
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the staging password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3 text-left">
          <label htmlFor="staging-password" className="sr-only">
            Staging password
          </label>
          <input
            id="staging-password"
            type="password"
            autoComplete="current-password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />

          {error ? (
            <p className="text-center text-xs text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!passwordInput.trim()}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

function AppMain() {
  const workspace = useWorkspaceState();
  const {
    segment: activeSegment,
    setSegment: setActiveSegment,
    selectedTables,
    toggleTableSelection,
    showSandbox,
    setShowSandbox,
    sandboxPreferences,
    updateSandboxPreferences,
    isSandboxExpanded,
    setIsSandboxExpanded,
    activeTemplateId,
    setActiveTemplateId,
    editorTab: sandboxEditorTab,
    setEditorTab: setSandboxEditorTab,
    initialTemplateSql,
    resetWorkspace,
  } = workspace;

  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRelation, setHoveredRelation] = useState<HoveredRelation | null>(null);
  const [showDetails, setShowDetails] = useState(readShowDetailsPreference);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [sandboxSql, setSandboxSql] = useState(() => initialTemplateSql ?? '');
  const [sandboxDrawerHeight, setSandboxDrawerHeight] = useState(getDefaultSandboxHeight);
  const [templatesShortcutNonce, setTemplatesShortcutNonce] = useState(0);
  const [copilotSqlActive, setCopilotSqlActive] = useState(false);
  const relationLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleCopilot = useCallback(() => {
    setIsCopilotOpen((open) => !open);
  }, []);

  const handleApplyToSandbox = useCallback((sql: string) => {
    setSandboxSql(sql.trim());
    setShowSandbox(true);
    setIsSandboxExpanded(true);
    setCopilotSqlActive(true);
  }, [setIsSandboxExpanded, setShowSandbox]);

  const handleOpenSqlTemplates = useCallback(() => {
    setShowSandbox(true);
    setIsSandboxExpanded(true);
    setSandboxEditorTab('templates');
    setTemplatesShortcutNonce((nonce) => nonce + 1);
  }, [setIsSandboxExpanded, setSandboxEditorTab, setShowSandbox]);

  const activeTables = useMemo(
    () => dedupeTablesByName(getTablesForSegment(activeSegment)),
    [activeSegment],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_DETAILS_STORAGE_KEY, String(showDetails));
    } catch {
      /* ignore */
    }
  }, [showDetails]);

  useEffect(() => {
    setHoveredRelation(null);
  }, [activeSegment]);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );

  const selectedTableNames = useMemo(
    () => activeTables.map((table) => table.name).filter((name) => selectedTables.has(name)),
    [activeTables, selectedTables],
  );

  const sandboxOpen = selectedTableNames.length > 0 || showSandbox;

  const canvasBottomPaddingPx = sandboxOpen
    ? isSandboxExpanded
      ? sandboxDrawerHeight + SANDBOX_RESIZE_GUTTER_HEIGHT_PX
      : SANDBOX_COLLAPSED_CHROME_HEIGHT_PX
    : 0;

  useEffect(() => {
    setCopilotSqlActive(false);
  }, [selectedTableNames]);

  const handleSandboxExpandedChange = useCallback(
    (expanded: boolean) => {
      setIsSandboxExpanded(expanded);
    },
    [setIsSandboxExpanded],
  );

  const canClearWorkspace = useMemo(
    () =>
      workspaceHasCustomState(
        {
          segment: activeSegment,
          selectedTableNames,
          showSandbox,
          activeTemplateId,
          sandboxPreferences,
        },
        { searchQuery },
      ),
    [
      activeSegment,
      selectedTableNames,
      showSandbox,
      activeTemplateId,
      sandboxPreferences,
      searchQuery,
    ],
  );

  const handleClearWorkspace = useCallback(() => {
    resetWorkspace();
    setSearchQuery('');
    setSandboxSql('');
    setCopilotSqlActive(false);
    setHoveredRelation(null);
  }, [resetWorkspace]);

  const clearRelationLeaveTimer = () => {
    if (relationLeaveTimerRef.current !== null) {
      clearTimeout(relationLeaveTimerRef.current);
      relationLeaveTimerRef.current = null;
    }
  };

  const handleFieldRelationHover = (tableName: string, field: DataViewField) => {
    clearRelationLeaveTimer();
    const relation = buildRelationHighlight(tableName, field, activeTables);
    setHoveredRelation(relation);
  };

  const handleFieldRelationLeave = () => {
    clearRelationLeaveTimer();
    relationLeaveTimerRef.current = setTimeout(() => {
      setHoveredRelation(null);
      relationLeaveTimerRef.current = null;
    }, RELATION_LEAVE_DELAY_MS);
  };

  const handleSignInRequired = useCallback(() => {
    setIsCopilotOpen(true);
  }, []);

  return (
    <AuthProvider>
      <div className="canvas-gradient flex h-screen w-screen flex-col overflow-hidden text-slate-900 transition-colors duration-300 ease-in-out dark:text-slate-100">
      <div className="sticky top-0 z-50 shrink-0">
        <Header
          onToggleCopilot={handleToggleCopilot}
          isCopilotOpen={isCopilotOpen}
          onSignInRequired={handleSignInRequired}
          onOpenSqlTemplates={handleOpenSqlTemplates}
        />
        <CommandToolbar
          activeSegment={activeSegment}
          onSegmentChange={setActiveSegment}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showDetails={showDetails}
          onShowDetailsChange={setShowDetails}
          canClearWorkspace={canClearWorkspace}
          onClearWorkspace={handleClearWorkspace}
        />
      </div>

      <div
        className="surface-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={canvasBottomPaddingPx > 0 ? { paddingBottom: canvasBottomPaddingPx } : undefined}
      >
        <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
          <CanvasHero />
          <div
            key={activeSegment}
            className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {activeTables.map((table, index) => (
              <div
                key={table.name}
                className="animate-fade-up"
                style={{ ['--stagger-delay' as string]: `${index * 20}ms` }}
              >
                <DataViewCard
                  table={table}
                  isSelected={selectedTables.has(table.name)}
                  onToggleSelect={toggleTableSelection}
                  normalizedSearchQuery={normalizedSearchQuery}
                  hoveredRelation={hoveredRelation}
                  onFieldRelationHover={handleFieldRelationHover}
                  onFieldRelationLeave={handleFieldRelationLeave}
                  showDetails={showDetails}
                  schemaTables={activeTables}
                />
              </div>
            ))}
          </div>
          <SiteFooter />
        </main>
      </div>

      <SqlGenerator
        selectedTableNames={selectedTableNames}
        schemaTables={activeTables}
        sql={sandboxSql}
        onSqlChange={setSandboxSql}
        isVisible={sandboxOpen}
        isExpanded={isSandboxExpanded}
        onExpandedChange={handleSandboxExpandedChange}
        sandboxPreferences={sandboxPreferences}
        onSandboxPreferencesChange={updateSandboxPreferences}
        activeTemplateId={activeTemplateId}
        onActiveTemplateIdChange={setActiveTemplateId}
        preserveSql={copilotSqlActive}
        editorTab={sandboxEditorTab}
        onEditorTabChange={setSandboxEditorTab}
        templatesShortcutNonce={templatesShortcutNonce}
        onSandboxHeightChange={setSandboxDrawerHeight}
      />

      <AiCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onApplyToSandbox={handleApplyToSandbox}
        activeTables={selectedTableNames}
        currentQueryText={sandboxSql}
      />

      </div>
    </AuthProvider>
  );
}

function App() {
  const stagingGateActive = isStagingGateActive();
  const [isStagingUnlocked, setIsStagingUnlocked] = useState(
    () => !stagingGateActive || readStagingUnlocked(),
  );

  if (stagingGateActive && !isStagingUnlocked) {
    return (
      <>
        <StagingGateScreen
          onUnlock={() => setIsStagingUnlocked(true)}
          onSubmitPassword={(attempt) => attempt === stagingPassword}
        />
        <Analytics />
      </>
    );
  }

  return (
    <>
      <AppMain />
      <Analytics />
    </>
  );
}

export default App;
