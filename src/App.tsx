import { useEffect, useMemo, useRef, useState } from 'react';
import { DataViewCard } from './components/DataViewCard';
import { Header } from './components/Header';
import { SqlGenerator } from './components/SqlGenerator';
import { ViewSegmentNav } from './components/ViewSegmentNav';
import type { DataViewField } from './data/sfmcSchema';
import {
  getTablesForSegment,
  readViewSegmentPreference,
  VIEW_SEGMENT_STORAGE_KEY,
  type ViewSegmentId,
} from './data/viewSegments';
import type { HoveredRelation } from './utils/schemaExplorer';
import { buildRelationHighlight, normalizeSearchQuery } from './utils/schemaExplorer';

const RELATION_LEAVE_DELAY_MS = 40;
const SHOW_DETAILS_STORAGE_KEY = 'sfmc-show-details';

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
    () => getTablesForSegment(activeSegment),
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

  const handleSegmentChange = (segment: ViewSegmentId) => {
    setActiveSegment(segment);
  };

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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-300 ease-in-out dark:bg-slate-950 dark:text-slate-100">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showDetails={showDetails}
        onShowDetailsChange={setShowDetails}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <ViewSegmentNav activeSegment={activeSegment} onSegmentChange={handleSegmentChange} />

        <main
          className={`min-w-0 flex-1 px-4 py-6 transition-[padding] duration-500 sm:px-6 lg:px-8 lg:py-8 ${
            selectedTableNames.length > 0 ? 'pb-72' : ''
          }`}
        >
          <div className="mb-6 lg:hidden">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Active segment
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {activeTables.length} table{activeTables.length === 1 ? '' : 's'} on canvas
            </p>
          </div>

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
