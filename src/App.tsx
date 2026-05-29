import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiCopilot } from './components/AiCopilot';
import { CommandToolbar } from './components/CommandToolbar';
import { DataViewCard } from './components/DataViewCard';
import { Header } from './components/Header';
import { SiteFooter } from './components/SiteFooter';
import { SqlGenerator } from './components/SqlGenerator';
import type { DataViewField } from './data/sfmcSchema';
import {
  dedupeTablesByName,
  getTablesForSegment,
  readViewSegmentPreference,
  VIEW_SEGMENT_STORAGE_KEY,
  type ViewSegmentId,
} from './data/viewSegments';
import type { HoveredRelation } from './utils/schemaExplorer';
import { buildRelationHighlight, normalizeSearchQuery } from './utils/schemaExplorer';

const RELATION_LEAVE_DELAY_MS = 40;
const SHOW_DETAILS_STORAGE_KEY = 'sfmc-show-details';
/** Matches SqlGenerator expanded drawer height so cards clear the sandbox. */
const SANDBOX_CANVAS_PADDING = 'pb-[450px]';

function readShowDetailsPreference(): boolean {
  try {
    return localStorage.getItem(SHOW_DETAILS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<ViewSegmentId>(readViewSegmentPreference);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [hoveredRelation, setHoveredRelation] = useState<HoveredRelation | null>(null);
  const [showDetails, setShowDetails] = useState(readShowDetailsPreference);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [sandboxSql, setSandboxSql] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [isSandboxExpanded, setIsSandboxExpanded] = useState(true);
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
  }, []);

  const activeTables = useMemo(
    () => dedupeTablesByName(getTablesForSegment(activeSegment)),
    [activeSegment],
  );

  const activeTableNames = useMemo(
    () => new Set(activeTables.map((table) => table.name)),
    [activeTables],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_DETAILS_STORAGE_KEY, String(showDetails));
    } catch {
      /* ignore */
    }
  }, [showDetails]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_SEGMENT_STORAGE_KEY, activeSegment);
    } catch {
      /* ignore */
    }
  }, [activeSegment]);

  useEffect(() => {
    setHoveredRelation(null);
    setSelectedTables((previous) => {
      const next = new Set([...previous].filter((name) => activeTableNames.has(name)));
      return next.size === previous.size ? previous : next;
    });
  }, [activeSegment, activeTableNames]);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );

  const selectedTableNames = useMemo(
    () => activeTables.map((table) => table.name).filter((name) => selectedTables.has(name)),
    [activeTables, selectedTables],
  );

  const sandboxOpen = selectedTableNames.length > 0 || showSandbox;

  useEffect(() => {
    setCopilotSqlActive(false);
  }, [selectedTableNames]);

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

  const handleToggleTableSelect = (tableName: string) => {
    setSelectedTables((previous) => {
      const next = new Set(previous);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f8fafc] text-slate-900 transition-colors duration-300 ease-in-out dark:bg-slate-950 dark:text-slate-100">
      <div className="z-40 shrink-0">
        <Header
          onToggleCopilot={handleToggleCopilot}
          isCopilotOpen={isCopilotOpen}
        />
        <CommandToolbar
          activeSegment={activeSegment}
          onSegmentChange={setActiveSegment}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showDetails={showDetails}
          onShowDetailsChange={setShowDetails}
        />
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f8fafc] dark:bg-slate-950 ${
          sandboxOpen ? SANDBOX_CANVAS_PADDING : ''
        }`}
      >
        <main className="mx-auto w-full max-w-7xl p-6 sm:p-8">
          <div
            key={activeSegment}
            className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {activeTables.map((table) => (
              <DataViewCard
                key={table.name}
                table={table}
                isSelected={selectedTables.has(table.name)}
                onToggleSelect={handleToggleTableSelect}
                normalizedSearchQuery={normalizedSearchQuery}
                hoveredRelation={hoveredRelation}
                onFieldRelationHover={handleFieldRelationHover}
                onFieldRelationLeave={handleFieldRelationLeave}
                showDetails={showDetails}
                schemaTables={activeTables}
              />
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
        onExpandedChange={setIsSandboxExpanded}
        preserveSql={copilotSqlActive}
      />

      <AiCopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onApplyToSandbox={handleApplyToSandbox}
      />
    </div>
  );
}

export default App;
