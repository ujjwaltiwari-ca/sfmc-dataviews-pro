import { useEffect, useMemo, useRef, useState } from 'react';
import { CommandToolbar } from './components/CommandToolbar';
import { DataViewCard } from './components/DataViewCard';
import { Header } from './components/Header';
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
  const relationLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const sandboxOpen = selectedTableNames.length > 0;

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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 ease-in-out dark:bg-slate-950 dark:text-slate-100">
      <div className="z-40 shrink-0">
        <Header />
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
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
          sandboxOpen ? SANDBOX_CANVAS_PADDING : ''
        }`}
      >
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div
            key={activeSegment}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
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
        </main>
      </div>

      <SqlGenerator selectedTableNames={selectedTableNames} schemaTables={activeTables} />
    </div>
  );
}

export default App;
