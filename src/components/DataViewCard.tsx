import { KeyRound, Link2 } from 'lucide-react';
import type { DataViewField, DataViewTable } from '../data/sfmcSchema';
import type { HoveredRelation } from '../utils/schemaExplorer';
import {
  buildRelationHighlight,
  fieldMatchesSearch,
  isFieldRelationHighlighted,
  isSameFieldRef,
  tableHasMatchingField,
} from '../utils/schemaExplorer';

type DataViewCategory = DataViewTable['category'];

type CategoryTheme = {
  accent: string;
  badge: string;
  headerTint: string;
};

const categoryThemes: Record<DataViewCategory, CategoryTheme> = {
  Sending: {
    accent: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-700 ring-blue-500/25 dark:text-blue-300',
    headerTint: 'from-blue-500/10 to-transparent dark:from-blue-500/15',
  },
  Tracking: {
    accent: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300',
    headerTint: 'from-emerald-500/10 to-transparent dark:from-emerald-500/15',
  },
  Journey: {
    accent: 'bg-violet-500',
    badge: 'bg-violet-500/15 text-violet-800 ring-violet-500/25 dark:text-violet-300',
    headerTint: 'from-violet-500/10 to-transparent dark:from-violet-500/15',
  },
  Subscribers: {
    accent: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-900 ring-amber-500/25 dark:text-amber-300',
    headerTint: 'from-amber-500/10 to-transparent dark:from-amber-500/15',
  },
  Subscription: {
    accent: 'bg-rose-500',
    badge: 'bg-rose-500/15 text-rose-800 ring-rose-500/25 dark:text-rose-300',
    headerTint: 'from-rose-500/10 to-transparent dark:from-rose-500/15',
  },
  Automation: {
    accent: 'bg-slate-500',
    badge: 'bg-slate-500/15 text-slate-800 ring-slate-500/25 dark:text-slate-300',
    headerTint: 'from-slate-500/10 to-transparent dark:from-slate-500/15',
  },
  Mobile: {
    accent: 'bg-cyan-500',
    badge: 'bg-cyan-500/15 text-cyan-800 ring-cyan-500/25 dark:text-cyan-300',
    headerTint: 'from-cyan-500/10 to-transparent dark:from-cyan-500/15',
  },
  GroupConnect: {
    accent: 'bg-lime-500',
    badge: 'bg-lime-500/15 text-lime-900 ring-lime-500/25 dark:text-lime-300',
    headerTint: 'from-lime-500/10 to-transparent dark:from-lime-500/15',
  },
  Social: {
    accent: 'bg-pink-500',
    badge: 'bg-pink-500/15 text-pink-800 ring-pink-500/25 dark:text-pink-300',
    headerTint: 'from-pink-500/10 to-transparent dark:from-pink-500/15',
  },
  Other: {
    accent: 'bg-stone-500',
    badge: 'bg-stone-500/15 text-stone-800 ring-stone-500/25 dark:text-stone-300',
    headerTint: 'from-stone-500/10 to-transparent dark:from-stone-500/15',
  },
  SendLog: {
    accent: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-900 ring-orange-500/25 dark:text-orange-300',
    headerTint: 'from-orange-500/10 to-transparent dark:from-orange-500/15',
  },
  Synchronized: {
    accent: 'bg-indigo-500',
    badge: 'bg-indigo-500/15 text-indigo-800 ring-indigo-500/25 dark:text-indigo-300',
    headerTint: 'from-indigo-500/10 to-transparent dark:from-indigo-500/15',
  },
};

const typeBadgeStyles: Record<DataViewField['type'], string> = {
  Text: 'bg-sky-500/15 text-sky-800 ring-sky-500/30 dark:text-sky-300',
  Number: 'bg-violet-500/15 text-violet-800 ring-violet-500/30 dark:text-violet-300',
  Date: 'bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-300',
  Boolean: 'bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-300',
  Decimal: 'bg-teal-500/15 text-teal-800 ring-teal-500/30 dark:text-teal-300',
};

function formatFieldType(field: DataViewField): string {
  if (field.type === 'Text' && field.length !== undefined) {
    return `${field.type}(${field.length})`;
  }
  return field.type;
}

function isRelationSource(
  hoveredRelation: HoveredRelation | null,
  tableName: string,
  fieldName: string,
): boolean {
  return (
    hoveredRelation !== null &&
    isSameFieldRef(hoveredRelation.source, tableName, fieldName)
  );
}

interface DataViewCardProps {
  table: DataViewTable;
  isSelected: boolean;
  onToggleSelect: (tableName: string) => void;
  normalizedSearchQuery: string;
  hoveredRelation: HoveredRelation | null;
  onFieldRelationHover: (tableName: string, field: DataViewField) => void;
  onFieldRelationLeave: () => void;
  showDetails: boolean;
  schemaTables: DataViewTable[];
}

export function DataViewCard({
  table,
  isSelected,
  onToggleSelect,
  normalizedSearchQuery,
  hoveredRelation,
  onFieldRelationHover,
  onFieldRelationLeave,
  showDetails,
  schemaTables,
}: DataViewCardProps) {
  const theme = categoryThemes[table.category];
  const isSearchActive = normalizedSearchQuery.length > 0;
  const tableMatches = tableHasMatchingField(table, normalizedSearchQuery);
  const isCardDimmed = isSearchActive && !tableMatches;

  return (
    <article
      className={`group/card flex h-[450px] max-h-[500px] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/50 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-slate-300/60 dark:border-slate-700/90 dark:bg-slate-900 dark:shadow-black/30 dark:hover:shadow-black/50 ${
        isSelected
          ? 'ring-2 ring-cyan-500/60 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950'
          : ''
      } ${isCardDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <div className={`h-1.5 w-full shrink-0 ${theme.accent}`} aria-hidden />

      <header
        className={`relative shrink-0 border-b border-slate-100 bg-gradient-to-b px-4 py-3 dark:border-slate-800 ${theme.headerTint}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(table.name)}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-600 dark:bg-slate-800"
              aria-label={`Include ${table.name} in SQL query`}
            />
            <h2 className="truncate font-mono text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
              {table.name}
            </h2>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${theme.badge}`}
          >
            {table.category}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-400">
          {table.description}
        </p>
      </header>

      <div className="scrollbar-card min-h-0 flex-1 overflow-y-auto overflow-x-auto px-3 py-2 pr-2 sm:px-4">
        <table className="w-full min-w-[240px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th
                scope="col"
                className="pb-2 pl-1 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Field
              </th>
              <th
                scope="col"
                className="pb-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Type
              </th>
              <th
                scope="col"
                className="w-9 pb-2 pl-2 pr-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                PK
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {table.fields.map((field, fieldIndex) => (
              <FieldRow
                key={`${table.name}-${field.name}-${fieldIndex}`}
                tableName={table.name}
                field={field}
                normalizedSearchQuery={normalizedSearchQuery}
                isSearchActive={isSearchActive}
                tableMatches={tableMatches}
                hoveredRelation={hoveredRelation}
                onFieldRelationHover={onFieldRelationHover}
                onFieldRelationLeave={onFieldRelationLeave}
                showDetails={showDetails}
                schemaTables={schemaTables}
              />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

interface FieldRowProps {
  tableName: string;
  field: DataViewField;
  normalizedSearchQuery: string;
  isSearchActive: boolean;
  tableMatches: boolean;
  hoveredRelation: HoveredRelation | null;
  onFieldRelationHover: (tableName: string, field: DataViewField) => void;
  onFieldRelationLeave: () => void;
  showDetails: boolean;
  schemaTables: DataViewTable[];
}

function FieldRow({
  tableName,
  field,
  normalizedSearchQuery,
  isSearchActive,
  tableMatches,
  hoveredRelation,
  onFieldRelationHover,
  onFieldRelationLeave,
  showDetails,
  schemaTables,
}: FieldRowProps) {
  const fieldMatches = fieldMatchesSearch(field.name, normalizedSearchQuery);
  const isFieldDimmed = isSearchActive && tableMatches && !fieldMatches;
  const isRelationHighlighted = isFieldRelationHighlighted(
    hoveredRelation,
    tableName,
    field.name,
  );
  const isSource = isRelationSource(hoveredRelation, tableName, field.name);
  const isTargetGlow = isRelationHighlighted && !isSource;
  const isRelationInteractive =
    buildRelationHighlight(tableName, field, schemaTables) !== null;

  return (
    <tr
      className={`transition-[background-color,box-shadow,opacity] ease-out ${
        isSource ? 'bg-indigo-600/20 duration-75' : 'duration-200'
      } ${
        isTargetGlow
          ? 'shadow-[inset_0_0_0_2px_rgba(99,102,241,0.55),0_0_14px_rgba(99,102,241,0.2)] ring-1 ring-inset ring-indigo-400/50 dark:shadow-[inset_0_0_0_2px_rgba(129,140,248,0.5),0_0_16px_rgba(99,102,241,0.25)]'
          : ''
      } ${isFieldDimmed ? 'opacity-30' : 'opacity-100'} ${
        isRelationInteractive ? 'cursor-pointer' : ''
      }`}
      onMouseEnter={() => {
        if (isRelationInteractive) {
          onFieldRelationHover(tableName, field);
        }
      }}
      onMouseLeave={() => {
        if (isRelationInteractive) {
          onFieldRelationLeave();
        }
      }}
    >
      <td className="py-2 pl-1 pr-2 align-top">
        <div className="flex min-w-0 items-start gap-1.5">
          {isRelationInteractive && (
            <Link2
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                isRelationHighlighted ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
              }`}
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            <span
              className={`block truncate font-mono text-xs font-medium sm:text-sm ${
                isRelationHighlighted
                  ? 'text-indigo-950 dark:text-indigo-100'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {field.name}
            </span>
            <div
              className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
                showDetails ? 'mt-1.5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {field.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 align-top">
        <span
          className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset sm:text-xs ${typeBadgeStyles[field.type]}`}
        >
          {formatFieldType(field)}
        </span>
      </td>
      <td className="py-2 pl-2 pr-1 text-center align-top">
        {field.isPrimaryKey ? (
          <span className="inline-flex" title="Primary key">
            <KeyRound
              className={`mx-auto h-4 w-4 ${
                isRelationHighlighted
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
              aria-label="Primary key"
            />
          </span>
        ) : (
          <span className="inline-block h-4 w-4" aria-hidden />
        )}
      </td>
    </tr>
  );
}
