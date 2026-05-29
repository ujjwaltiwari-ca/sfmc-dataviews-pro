import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { DataViewCard } from './components/DataViewCard';
import { SqlGenerator } from './components/SqlGenerator';
import { sfmcDataViews } from './data/sfmcSchema';
import type { DataViewField } from './data/sfmcSchema';
import type { HoveredRelation } from './utils/schemaExplorer';
import { buildRelationHighlight, normalizeSearchQuery } from './utils/schemaExplorer';

const RELATION_LEAVE_DELAY_MS = 40;

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [hoveredRelation, setHoveredRelation] = useState<HoveredRelation | null>(null);
  const relationLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );

  const selectedTableNames = useMemo(
    () =>
      sfmcDataViews
        .map((table) => table.name)
        .filter((name) => selectedTables.has(name)),
    [selectedTables],
  );

  const clearRelationLeaveTimer = () => {
    if (relationLeaveTimerRef.current !== null) {
      clearTimeout(relationLeaveTimerRef.current);
      relationLeaveTimerRef.current = null;
    }
  };

  const handleFieldRelationHover = (tableName: string, field: DataViewField) => {
    clearRelationLeaveTimer();
    const relation = buildRelationHighlight(tableName, field, sfmcDataViews);
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-8 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            SFMC Data Views
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Schema reference for Salesforce Marketing Cloud system data views — fields,
            types, and primary keys. Select tables to generate JOIN SQL.
          </p>

          <div className="relative mt-6 max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by field name (e.g. JobID, SubscriberKey)…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              aria-label="Search fields by name"
            />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto max-w-7xl px-4 py-8 transition-[padding] duration-500 sm:px-6 lg:px-8 ${
          selectedTableNames.length > 0 ? 'pb-72' : ''
        }`}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sfmcDataViews.map((table) => (
            <DataViewCard
              key={table.name}
              table={table}
              isSelected={selectedTables.has(table.name)}
              onToggleSelect={handleToggleTableSelect}
              normalizedSearchQuery={normalizedSearchQuery}
              hoveredRelation={hoveredRelation}
              onFieldRelationHover={handleFieldRelationHover}
              onFieldRelationLeave={handleFieldRelationLeave}
            />
          ))}
        </div>
      </main>

      <SqlGenerator selectedTableNames={selectedTableNames} />
    </div>
  );
}

export default App;
