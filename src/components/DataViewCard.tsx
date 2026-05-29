import { Key } from 'lucide-react';
import type { DataViewField, DataViewTable } from '../data/sfmcSchema';
import { sfmcDataViews } from '../data/sfmcSchema';
import type { HoveredRelation } from '../utils/schemaExplorer';
import {
  buildRelationHighlight,
  fieldMatchesSearch,
  isFieldRelationHighlighted,
  tableHasMatchingField,
} from '../utils/schemaExplorer';

type DataViewCategory = DataViewTable['category'];

const categoryStyles: Record<
  DataViewCategory,
  { border: string; header: string; badge: string; type: string }
> = {
  Sending: {
    border: 'border-blue-500',
    header: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    type: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  },
  Tracking: {
    border: 'border-emerald-500',
    header: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    type: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  },
  Journey: {
    border: 'border-violet-500',
    header: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-100 text-violet-800 ring-violet-600/20',
    type: 'bg-violet-50 text-violet-700 ring-violet-500/20',
  },
  Subscribers: {
    border: 'border-amber-500',
    header: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-900 ring-amber-600/20',
    type: 'bg-amber-50 text-amber-800 ring-amber-500/20',
  },
};

function formatFieldType(field: DataViewField): string {
  if (field.type === 'Text' && field.length !== undefined) {
    return `${field.type}(${field.length})`;
  }
  return field.type;
}

interface DataViewCardProps {
  table: DataViewTable;
  isSelected: boolean;
  onToggleSelect: (tableName: string) => void;
  normalizedSearchQuery: string;
  hoveredRelation: HoveredRelation | null;
  onFieldRelationHover: (tableName: string, field: DataViewField) => void;
  onFieldRelationLeave: () => void;
}

export function DataViewCard({
  table,
  isSelected,
  onToggleSelect,
  normalizedSearchQuery,
  hoveredRelation,
  onFieldRelationHover,
  onFieldRelationLeave,
}: DataViewCardProps) {
  const styles = categoryStyles[table.category];
  const isSearchActive = normalizedSearchQuery.length > 0;
  const tableMatches = tableHasMatchingField(table, normalizedSearchQuery);
  const isCardDimmed = isSearchActive && !tableMatches;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all duration-300 ease-in-out hover:shadow-md ${styles.border} ${
        isCardDimmed ? 'opacity-30' : 'opacity-100'
      }`}
    >
      <header className={`border-b px-4 py-3 ${styles.header}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(table.name)}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500/40"
              aria-label={`Include ${table.name} in SQL query`}
            />
            <h2 className="truncate font-mono text-lg font-semibold tracking-tight text-slate-900">
              {table.name}
            </h2>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles.badge}`}
          >
            {table.category}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-snug text-slate-600">{table.description}</p>
      </header>

      <div className="flex-1 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Fields ({table.fields.length})
        </p>
        <ul className="space-y-1.5">
          {table.fields.map((field) => {
            const fieldMatches = fieldMatchesSearch(field.name, normalizedSearchQuery);
            const isFieldDimmed = isSearchActive && tableMatches && !fieldMatches;
            const isRelationHighlighted = isFieldRelationHighlighted(
              hoveredRelation,
              table.name,
              field.name,
            );
            const isRelationInteractive =
              buildRelationHighlight(table.name, field, sfmcDataViews) !== null;

            return (
              <li
                key={field.name}
                className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-all duration-300 ease-in-out ${
                  isRelationHighlighted
                    ? 'border-2 border-cyan-500 bg-cyan-100 shadow-sm ring-2 ring-cyan-400/50'
                    : field.isPrimaryKey
                      ? 'border border-transparent bg-amber-50 ring-1 ring-amber-200'
                      : 'border border-transparent bg-slate-50/80 hover:bg-slate-100/80'
                } ${isFieldDimmed ? 'opacity-30' : 'opacity-100'} ${
                  isRelationInteractive ? 'cursor-pointer' : ''
                }`}
                onMouseEnter={() => {
                  if (isRelationInteractive) {
                    onFieldRelationHover(table.name, field);
                  }
                }}
                onMouseLeave={() => {
                  if (isRelationInteractive) {
                    onFieldRelationLeave();
                  }
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {field.isPrimaryKey && (
                    <Key
                      className={`h-4 w-4 shrink-0 ${
                        isRelationHighlighted ? 'text-cyan-700' : 'text-amber-600'
                      }`}
                      aria-label="Primary key"
                    />
                  )}
                  <span
                    className={`truncate font-mono font-medium ${
                      isRelationHighlighted
                        ? 'text-cyan-950'
                        : field.isPrimaryKey
                          ? 'text-amber-900'
                          : 'text-slate-800'
                    }`}
                  >
                    {field.name}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-medium ring-1 ring-inset ${
                    isRelationHighlighted ? 'bg-cyan-200 text-cyan-900 ring-cyan-500/30' : styles.type
                  }`}
                >
                  {formatFieldType(field)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
