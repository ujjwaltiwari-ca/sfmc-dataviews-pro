import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Lock } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { DeferredAuthProvider } from './context/DeferredAuthProvider';
import { BRAND_NAME } from './constants/brand';
import {
  canvasGridGapClassName,
  canvasGridItemClassName,
  canvasMainMaxWidthClassName,
  CANVAS_DENSITY_STORAGE_KEY,
  readCanvasDensityPreference,
  type CanvasDensity,
} from './constants/canvasDensity';
import {
  getDefaultSandboxHeight,
  SANDBOX_COLLAPSED_CHROME_HEIGHT_PX,
  SANDBOX_RESIZE_GUTTER_HEIGHT_PX,
} from './constants/sandboxLayout';
import { FOCUS_CANVAS_SEARCH_EVENT, OPEN_WHATS_NEW_EVENT } from './constants/siteChromeEvents';
import { hasSeenWhatsNew, recordAppVisit, shouldAutoOpenWhatsNew } from './content/changelog';

const AiCopilot = lazy(() =>
  import('./components/AiCopilot').then((module) => ({ default: module.AiCopilot })),
);
const SqlGenerator = lazy(() =>
  import('./components/SqlGenerator').then((module) => ({ default: module.SqlGenerator })),
);
import { CanvasHero } from './components/CanvasHero';
import { CommandToolbar } from './components/CommandToolbar';
import { DataViewCard } from './components/DataViewCard';
import { Header } from './components/Header';
import { SchemaArchitectMark } from './components/SchemaArchitectMark';
import { SiteFooter } from './components/SiteFooter';
import { WhatsNewModal } from './components/WhatsNewModal';
import type { DataViewField } from './data/sfmcSchema';
import { dedupeTablesByName, getTablesForSegment, type ViewSegmentId } from './data/viewSegments';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import {
  buildWorkspaceShareUrl,
  workspaceHasCustomState,
  type WorkspaceSnapshot,
} from './utils/workspacePersistence';
import { hasPersistedSupabaseSession } from './utils/supabaseSessionStorage';
import { buildRelationHighlight, normalizeSearchQuery, type HoveredRelation } from './utils/schemaExplorer';

type StagingGateStatus = 'loading' | 'disabled' | 'locked' | 'unlocked';

const RELATION_LEAVE_DELAY_MS = 40;

function StagingBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      Loading…
    </div>
  );
}

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

async function fetchStagingGateStatus(): Promise<StagingGateStatus> {
  try {
    const response = await fetch('/api/staging', { credentials: 'include' });
    if (!response.ok) {
      return 'locked';
    }
    const payload = (await response.json()) as { enabled?: boolean; unlocked?: boolean };
    if (!payload.enabled) {
      return 'disabled';
    }
    return payload.unlocked ? 'unlocked' : 'locked';
  } catch {
    return 'locked';
  }
}

async function submitStagingPassword(password: string): Promise<'ok' | 'invalid' | 'rate_limited'> {
  try {
    const response = await fetch('/api/staging', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (response.status === 429) {
      return 'rate_limited';
    }
    if (!response.ok) {
      return 'invalid';
    }
    const payload = (await response.json()) as { unlocked?: boolean };
    return payload.unlocked === true ? 'ok' : 'invalid';
  } catch {
    return 'invalid';
  }
}

function StagingGateScreen({ onUnlock }: { onUnlock: () => void }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitStagingPassword(passwordInput);
      if (result === 'ok') {
        onUnlock();
        return;
      }
      if (result === 'rate_limited') {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError('Incorrect password. Please try again.');
      }
      setPasswordInput('');
    } finally {
      setIsSubmitting(false);
    }
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
          {BRAND_NAME} — Private Preview
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the preview password to access the workspace.
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
            disabled={!passwordInput.trim() || isSubmitting}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying…' : 'Unlock'}
          </button>
        </form>

        <footer className="absolute inset-x-0 bottom-6 text-center text-xs text-slate-500">
          <a href="/privacy/" className="transition-colors hover:text-slate-300">
            Privacy Policy
          </a>
          <span aria-hidden> · </span>
          <a href="/terms/" className="transition-colors hover:text-slate-300">
            Terms of Use
          </a>
        </footer>
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
  const [canvasDensity, setCanvasDensity] = useState<CanvasDensity>(readCanvasDensityPreference);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [authShellActive, setAuthShellActive] = useState(() => hasPersistedSupabaseSession());
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [whatsNewUnseen, setWhatsNewUnseen] = useState(() => !hasSeenWhatsNew());
  const [sandboxSql, setSandboxSql] = useState(() => initialTemplateSql ?? '');
  const [sandboxDrawerHeight, setSandboxDrawerHeight] = useState(getDefaultSandboxHeight);
  const [templatesShortcutNonce, setTemplatesShortcutNonce] = useState(0);
  const [copilotSqlActive, setCopilotSqlActive] = useState(false);
  const relationLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateAuthShell = useCallback(() => {
    setAuthShellActive(true);
  }, []);

  const handleToggleCopilot = useCallback(() => {
    activateAuthShell();
    setIsCopilotOpen((open) => !open);
  }, [activateAuthShell]);

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

  const handleSegmentChange = useCallback(
    (nextSegment: ViewSegmentId) => {
      setActiveSegment(nextSegment);
      setHoveredRelation(null);
    },
    [setActiveSegment],
  );

  const activeTables = useMemo(
    () => dedupeTablesByName(getTablesForSegment(activeSegment)),
    [activeSegment],
  );

  useEffect(() => {
    recordAppVisit();
    if (shouldAutoOpenWhatsNew()) {
      setIsWhatsNewOpen(true);
    }

    const handleOpenWhatsNew = () => setIsWhatsNewOpen(true);
    window.addEventListener(OPEN_WHATS_NEW_EVENT, handleOpenWhatsNew);
    return () => window.removeEventListener(OPEN_WHATS_NEW_EVENT, handleOpenWhatsNew);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_DETAILS_STORAGE_KEY, String(showDetails));
    } catch {
      /* ignore */
    }
  }, [showDetails]);

  useEffect(() => {
    try {
      localStorage.setItem(CANVAS_DENSITY_STORAGE_KEY, canvasDensity);
    } catch {
      /* ignore */
    }
  }, [canvasDensity]);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );

  const selectedTableNames = useMemo(
    () => activeTables.map((table) => table.name).filter((name) => selectedTables.has(name)),
    [activeTables, selectedTables],
  );

  useEffect(() => {
    setCopilotSqlActive(false);
  }, [selectedTableNames.length]);

  const workspaceSnapshot = useMemo<WorkspaceSnapshot>(
    () => ({
      segment: activeSegment,
      selectedTableNames,
      showSandbox,
      activeTemplateId,
      sandboxPreferences,
    }),
    [
      activeSegment,
      selectedTableNames,
      showSandbox,
      activeTemplateId,
      sandboxPreferences,
    ],
  );

  const handleCopyWorkspaceLink = useCallback(async (): Promise<boolean> => {
    const url = buildWorkspaceShareUrl(workspaceSnapshot);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, [workspaceSnapshot]);

  const handleStartWithSent = useCallback(() => {
    const scrollToSent = () => {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[data-table-card="_Sent"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };

    if (activeSegment !== 'core') {
      handleSegmentChange('core');
      window.requestAnimationFrame(() => {
        toggleTableSelection('_Sent');
        scrollToSent();
      });
      return;
    }

    if (!selectedTables.has('_Sent')) {
      toggleTableSelection('_Sent');
    } else {
      setShowSandbox(true);
      setIsSandboxExpanded(true);
    }
    scrollToSent();
  }, [
    activeSegment,
    handleSegmentChange,
    selectedTables,
    setIsSandboxExpanded,
    setShowSandbox,
    toggleTableSelection,
  ]);

  const handleFocusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent(FOCUS_CANVAS_SEARCH_EVENT));
  }, []);

  const sandboxOpen = selectedTableNames.length > 0 || showSandbox;

  const canvasBottomPaddingPx = sandboxOpen
    ? isSandboxExpanded
      ? sandboxDrawerHeight + SANDBOX_RESIZE_GUTTER_HEIGHT_PX
      : SANDBOX_COLLAPSED_CHROME_HEIGHT_PX
    : 0;

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
    activateAuthShell();
    setIsCopilotOpen(true);
  }, [activateAuthShell]);

  return (
    <DeferredAuthProvider active={authShellActive}>
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
          onSegmentChange={handleSegmentChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showDetails={showDetails}
          onShowDetailsChange={setShowDetails}
          canvasDensity={canvasDensity}
          onCanvasDensityChange={setCanvasDensity}
          canClearWorkspace={canClearWorkspace}
          onClearWorkspace={handleClearWorkspace}
          onCopyWorkspaceLink={handleCopyWorkspaceLink}
        />
      </div>


      <div
        className="surface-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={canvasBottomPaddingPx > 0 ? { paddingBottom: canvasBottomPaddingPx } : undefined}
      >
        <main className={`mx-auto w-full ${canvasMainMaxWidthClassName(canvasDensity)} p-6 sm:p-8`}>
          <CanvasHero
            onStartWithSent={handleStartWithSent}
            onFocusSearch={handleFocusSearch}
          />
          <div
            key={activeSegment}
            className={`flex flex-wrap justify-center ${canvasGridGapClassName(canvasDensity)}`}
          >
            {activeTables.map((table, index) => (
              <div
                key={table.name}
                data-table-card={table.name}
                className={canvasGridItemClassName(canvasDensity)}
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
                  compact={canvasDensity === 'compact'}
                />
              </div>
            ))}
          </div>
          <SiteFooter showWhatsNewBadge={whatsNewUnseen} />
        </main>
      </div>

      <Suspense fallback={null}>
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
      </Suspense>

      {isCopilotOpen ? (
        <Suspense fallback={null}>
          <AiCopilot
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            onApplyToSandbox={handleApplyToSandbox}
            activeTables={selectedTableNames}
            currentQueryText={sandboxSql}
          />
        </Suspense>
      ) : null}

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => {
          setIsWhatsNewOpen(false);
          setWhatsNewUnseen(!hasSeenWhatsNew());
        }}
      />

      </div>
    </DeferredAuthProvider>
  );
}

function App() {
  const [stagingStatus, setStagingStatus] = useState<StagingGateStatus>('loading');

  useEffect(() => {
    let isMounted = true;
    void fetchStagingGateStatus().then((status) => {
      if (isMounted) {
        setStagingStatus(status);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (stagingStatus === 'loading') {
    return <StagingBootScreen />;
  }

  if (stagingStatus === 'locked') {
    return (
      <>
        <StagingGateScreen onUnlock={() => setStagingStatus('unlocked')} />
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
