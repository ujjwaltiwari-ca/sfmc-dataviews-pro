import { Link2 } from 'lucide-react';
import type { DataViewField, DataViewTable } from '../data/sfmcSchema';
import { TruncatedText } from './TruncatedText';
import type { HoveredRelation } from '../utils/schemaExplorer';
import {
  buildRelationHighlight,
  fieldMatchesSearch,
  isFieldRelationHighlighted,
  isSameFieldRef,
  tableMatchesSearch,
  tableNameMatchesSearch,
} from '../utils/schemaExplorer';
import { getFieldTypeSyntaxClass } from '../utils/typeSyntax';

type DataViewCategory = DataViewTable['category'];

type CategoryTheme = {
  categoryBadge: string;
  accentLine: string;
  pathRowRing: string;
  pathRowBg: string;
  pathText: string;
  pathIcon: string;
  linkHover: string;
};

const CARD_BASE_CLASS =
  'bg-white rounded-xl border border-slate-200/60 shadow-[0_4px_24px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-300/70 hover:shadow-[0_8px_32px_rgba(15,23,42,0.09),0_2px_6px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out dark:bg-slate-950 dark:border-slate-800/60 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] dark:hover:border-slate-700/80';

const categoryThemes: Record<DataViewCategory, CategoryTheme> = {
  Sending: {
    categoryBadge:
      'bg-blue-50/90 text-blue-800 ring-1 ring-inset ring-blue-200/80 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800/60',
    accentLine: 'bg-blue-500',
    pathRowRing: 'ring-1 ring-inset ring-blue-200/60 dark:ring-blue-800/40',
    pathRowBg: 'bg-blue-50/80 dark:bg-blue-950/30',
    pathText: 'text-blue-950 dark:text-blue-50',
    pathIcon: 'text-blue-600 dark:text-blue-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400',
  },
  Tracking: {
    categoryBadge:
      'bg-emerald-50/90 text-emerald-800 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60',
    accentLine: 'bg-emerald-500',
    pathRowRing: 'ring-1 ring-inset ring-emerald-200/60 dark:ring-emerald-800/40',
    pathRowBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    pathText: 'text-emerald-950 dark:text-emerald-50',
    pathIcon: 'text-emerald-600 dark:text-emerald-400',
    linkHover:
      'group-hover/row:opacity-100 group-hover/row:text-emerald-600 dark:group-hover/row:text-emerald-400',
  },
  Journey: {
    categoryBadge:
      'bg-violet-50/90 text-violet-800 ring-1 ring-inset ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/60',
    accentLine: 'bg-violet-500',
    pathRowRing: 'ring-1 ring-inset ring-violet-200/60 dark:ring-violet-800/40',
    pathRowBg: 'bg-violet-50/80 dark:bg-violet-950/30',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Subscribers: {
    categoryBadge:
      'bg-amber-50/90 text-amber-800 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60',
    accentLine: 'bg-amber-500',
    pathRowRing: 'ring-1 ring-inset ring-amber-200/60 dark:ring-amber-800/40',
    pathRowBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    pathText: 'text-amber-950 dark:text-amber-50',
    pathIcon: 'text-amber-600 dark:text-amber-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-amber-600 dark:group-hover/row:text-amber-400',
  },
  Subscription: {
    categoryBadge:
      'bg-rose-50/90 text-rose-800 ring-1 ring-inset ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800/60',
    accentLine: 'bg-rose-500',
    pathRowRing: 'ring-1 ring-inset ring-rose-200/60 dark:ring-rose-800/40',
    pathRowBg: 'bg-rose-50/80 dark:bg-rose-950/30',
    pathText: 'text-rose-950 dark:text-rose-50',
    pathIcon: 'text-rose-600 dark:text-rose-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-rose-600 dark:group-hover/row:text-rose-400',
  },
  Automation: {
    categoryBadge:
      'bg-violet-50/90 text-violet-800 ring-1 ring-inset ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/60',
    accentLine: 'bg-violet-500',
    pathRowRing: 'ring-1 ring-inset ring-violet-200/60 dark:ring-violet-800/40',
    pathRowBg: 'bg-violet-50/80 dark:bg-violet-950/30',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Mobile: {
    categoryBadge:
      'bg-cyan-50/90 text-cyan-800 ring-1 ring-inset ring-cyan-200/80 dark:bg-cyan-950/50 dark:text-cyan-200 dark:ring-cyan-800/60',
    accentLine: 'bg-cyan-500',
    pathRowRing: 'ring-1 ring-inset ring-cyan-200/60 dark:ring-cyan-800/40',
    pathRowBg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
    pathText: 'text-cyan-950 dark:text-cyan-50',
    pathIcon: 'text-cyan-600 dark:text-cyan-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-cyan-600 dark:group-hover/row:text-cyan-400',
  },
  GroupConnect: {
    categoryBadge:
      'bg-lime-50/90 text-lime-800 ring-1 ring-inset ring-lime-200/80 dark:bg-lime-950/50 dark:text-lime-200 dark:ring-lime-800/60',
    accentLine: 'bg-lime-500',
    pathRowRing: 'ring-1 ring-inset ring-lime-200/60 dark:ring-lime-800/40',
    pathRowBg: 'bg-lime-50/80 dark:bg-lime-950/30',
    pathText: 'text-lime-950 dark:text-lime-50',
    pathIcon: 'text-lime-600 dark:text-lime-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-lime-600 dark:group-hover/row:text-lime-400',
  },
  Social: {
    categoryBadge:
      'bg-pink-50/90 text-pink-800 ring-1 ring-inset ring-pink-200/80 dark:bg-pink-950/50 dark:text-pink-200 dark:ring-pink-800/60',
    accentLine: 'bg-pink-500',
    pathRowRing: 'ring-1 ring-inset ring-pink-200/60 dark:ring-pink-800/40',
    pathRowBg: 'bg-pink-50/80 dark:bg-pink-950/30',
    pathText: 'text-pink-950 dark:text-pink-50',
    pathIcon: 'text-pink-600 dark:text-pink-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-pink-600 dark:group-hover/row:text-pink-400',
  },
  Other: {
    categoryBadge:
      'bg-stone-50/90 text-stone-800 ring-1 ring-inset ring-stone-200/80 dark:bg-stone-950/50 dark:text-stone-200 dark:ring-stone-800/60',
    accentLine: 'bg-stone-500',
    pathRowRing: 'ring-1 ring-inset ring-stone-200/60 dark:ring-stone-800/40',
    pathRowBg: 'bg-stone-50/80 dark:bg-stone-950/30',
    pathText: 'text-stone-950 dark:text-stone-50',
    pathIcon: 'text-stone-600 dark:text-stone-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-stone-600 dark:group-hover/row:text-stone-400',
  },
  SendLog: {
    categoryBadge:
      'bg-orange-50/90 text-orange-800 ring-1 ring-inset ring-orange-200/80 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-800/60',
    accentLine: 'bg-orange-500',
    pathRowRing: 'ring-1 ring-inset ring-orange-200/60 dark:ring-orange-800/40',
    pathRowBg: 'bg-orange-50/80 dark:bg-orange-950/30',
    pathText: 'text-orange-950 dark:text-orange-50',
    pathIcon: 'text-orange-600 dark:text-orange-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-orange-600 dark:group-hover/row:text-orange-400',
  },
  Synchronized: {
    categoryBadge:
      'bg-indigo-50/90 text-indigo-800 ring-1 ring-inset ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800/60',
    accentLine: 'bg-indigo-500',
    pathRowRing: 'ring-1 ring-inset ring-indigo-200/60 dark:ring-indigo-800/40',
    pathRowBg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    pathText: 'text-indigo-950 dark:text-indigo-50',
    pathIcon: 'text-indigo-600 dark:text-indigo-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400',
  },
};

const CARD_HEADER_HEIGHT = 'h-[5.5rem]';

const FIELD_COLUMN_HEADER_CLASS =
  'text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';

const FIELD_GRID_COLS =
  'grid-cols-[minmax(0,1fr)_minmax(3.5rem,auto)_2.5rem]';

const KEY_COLUMN_HEADER_CLASS = `${FIELD_COLUMN_HEADER_CLASS} flex w-full items-center justify-end`;

const FIELD_ROW_BASE_CLASS =
  'group/row grid items-center gap-x-3 px-2 py-1.5 -mx-2 rounded-lg transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/50';

const PK_PILL_CLASS =
  'inline-flex bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50';

const FK_PILL_CLASS =
  'inline-flex bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50';

const LINK_ICON_IDLE =
  'text-indigo-400/70 opacity-80 transition-all duration-100 dark:text-indigo-400/60';

/** Positions link icon in row padding without shifting field name text. */
const FIELD_LINK_ICON_CLASS = 'absolute left-0 top-1 z-[1] h-3.5 w-3.5 -translate-x-[calc(100%+0.25rem)]';

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
  compact?: boolean;
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
  compact = false,
}: DataViewCardProps) {
  const theme = categoryThemes[table.category];
  const isSearchActive = normalizedSearchQuery.length > 0;
  const tableNameMatches = tableNameMatchesSearch(table.name, normalizedSearchQuery);
  const tableMatches = tableMatchesSearch(table, normalizedSearchQuery);
  const isCardDimmed = isSearchActive && !tableMatches;
  return (
    <article
      className={`group/card flex flex-col overflow-hidden transition-all duration-300 ease-out ${CARD_BASE_CLASS} ${
        compact ? 'h-[360px] max-h-[400px]' : 'h-[450px] max-h-[500px]'
      } ${isSelected ? 'card-selected' : ''} ${
        isCardDimmed ? 'card-search-dimmed' : 'opacity-100'
      }`}
    >
      <div
        className={`h-0.5 w-full shrink-0 transition-opacity duration-300 ease-out ${theme.accentLine} ${
          isSelected ? 'opacity-100' : 'opacity-50'
        }`}
        aria-hidden
      />

      <header
        className={`${compact ? 'h-[4.75rem]' : CARD_HEADER_HEIGHT} flex shrink-0 flex-col justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800/80`}
      >
        <div className="flex min-h-[1.5rem] items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(table.name)}
              className="card-select-checkbox h-3.5 w-3.5 shrink-0 cursor-pointer"
              aria-label={`Include ${table.name} in SQL query`}
            />
            <TruncatedText
              as="h2"
              text={table.name}
              className="min-w-0 flex-1 truncate font-mono text-sm font-semibold leading-none tracking-tight text-slate-900 dark:text-white"
            />
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm ${theme.categoryBadge}`}
          >
            {table.category}
          </span>
        </div>
        <TruncatedText
          as="p"
          text={table.description}
          clampLines={2}
          tooltipVariant="prose"
          className="line-clamp-2 h-8 text-xs leading-4 text-slate-500 dark:text-slate-400"
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`grid shrink-0 gap-x-3 border-b border-slate-100 px-4 pb-2 pt-2.5 dark:border-slate-800/80 ${FIELD_GRID_COLS}`}
          role="row"
        >
          <span className={FIELD_COLUMN_HEADER_CLASS} role="columnheader">
            Field
          </span>
          <span className={FIELD_COLUMN_HEADER_CLASS} role="columnheader">
            Type
          </span>
          <span className={KEY_COLUMN_HEADER_CLASS} role="columnheader">
            Key
          </span>
        </div>

        <div
          className="scrollbar-card-fields flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4"
          role="table"
          aria-label={`${table.name} fields`}
        >
          <div className="shrink-0 py-1" role="rowgroup">
            {table.fields.map((field, fieldIndex) => (
              <FieldRow
                key={`${table.name}-${field.name}-${fieldIndex}`}
                tableName={table.name}
                field={field}
                categoryTheme={theme}
                normalizedSearchQuery={normalizedSearchQuery}
                isSearchActive={isSearchActive}
                tableMatches={tableMatches}
                tableNameMatches={tableNameMatches}
                hoveredRelation={hoveredRelation}
                onFieldRelationHover={onFieldRelationHover}
                onFieldRelationLeave={onFieldRelationLeave}
                showDetails={showDetails}
                schemaTables={schemaTables}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

interface FieldRowProps {
  tableName: string;
  field: DataViewField;
  categoryTheme: CategoryTheme;
  normalizedSearchQuery: string;
  isSearchActive: boolean;
  tableMatches: boolean;
  tableNameMatches: boolean;
  hoveredRelation: HoveredRelation | null;
  onFieldRelationHover: (tableName: string, field: DataViewField) => void;
  onFieldRelationLeave: () => void;
  showDetails: boolean;
  schemaTables: DataViewTable[];
}

function FieldRow({
  tableName,
  field,
  categoryTheme,
  normalizedSearchQuery,
  isSearchActive,
  tableMatches,
  tableNameMatches,
  hoveredRelation,
  onFieldRelationHover,
  onFieldRelationLeave,
  showDetails,
  schemaTables,
}: FieldRowProps) {
  const fieldMatches = fieldMatchesSearch(field.name, normalizedSearchQuery);
  const isFieldDimmed =
    isSearchActive && tableMatches && !fieldMatches && !tableNameMatches;
  const isRelationHighlighted = isFieldRelationHighlighted(
    hoveredRelation,
    tableName,
    field.name,
  );
  const isSource = isRelationSource(hoveredRelation, tableName, field.name);
  const isTargetGlow = isRelationHighlighted && !isSource;
  const isPathActive = isSource || isTargetGlow;
  const isRelationInteractive =
    buildRelationHighlight(tableName, field, schemaTables) !== null;
  const hasForeignKey = Boolean(field.relatesTo?.length);
  const showForeignKeyMark =
    hasForeignKey || (isRelationInteractive && !field.isPrimaryKey);
  const showIndexedMark =
    field.isIndexed === true && !field.isPrimaryKey && !showForeignKeyMark;

  const fieldNameClass = isPathActive
    ? `${categoryTheme.pathText} font-medium text-sm antialiased`
    : 'font-medium text-sm text-slate-800 antialiased dark:text-slate-100';

  const descriptionClass = isPathActive
    ? `${categoryTheme.pathText} opacity-80`
    : 'text-slate-500 dark:text-slate-400';

  return (
    <div
      role="row"
      className={`${FIELD_ROW_BASE_CLASS} ${FIELD_GRID_COLS} ${
        isPathActive
          ? `${categoryTheme.pathRowBg} ${categoryTheme.pathRowRing}`
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
      <div role="cell" className="relative min-w-0">
        {isRelationInteractive && (
          <Link2
            className={`${FIELD_LINK_ICON_CLASS} ${
              isPathActive
                ? `opacity-100 ${categoryTheme.pathIcon}`
                : `${LINK_ICON_IDLE} ${categoryTheme.linkHover}`
            }`}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate ${fieldNameClass}`}>{field.name}</span>
          </span>
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
              showDetails ? 'mt-1.5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <p className={`text-xs leading-relaxed ${descriptionClass}`}>{field.description}</p>
            </div>
          </div>
        </div>
      </div>
      <div role="cell" className="self-center">
        <span className={getFieldTypeSyntaxClass(field)}>{formatFieldType(field)}</span>
      </div>
      <div role="cell" className="flex items-center justify-end self-center">
        {field.isPrimaryKey ? (
          <span className={PK_PILL_CLASS} title="Primary key">
            PK
          </span>
        ) : showForeignKeyMark ? (
          <span className={FK_PILL_CLASS} title="Foreign key">
            FK
          </span>
        ) : showIndexedMark ? (
          <span className={FK_PILL_CLASS} title="Indexed field">
            IDX
          </span>
        ) : (
          <span className="inline-block h-[22px] w-8" aria-hidden />
        )}
      </div>
    </div>
  );
}
