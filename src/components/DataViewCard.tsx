import { Info, KeyRound, Link2 } from 'lucide-react';
import { ProfileAttributeHelp } from './ProfileAttributeHelp';
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
  categoryBadge: string;
  accentDot: string;
  topGradient: string;
  cardHover: string;
  pathInset: string;
  pathRowBg: string;
  pathText: string;
  pathIcon: string;
  linkHover: string;
};

const CARD_BASE_CLASS =
  'bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.05)] transition-all duration-300 ease-out transform hover:-translate-y-0.5 dark:bg-slate-900/90 dark:border-slate-700/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.35)]';

const categoryThemes: Record<DataViewCategory, CategoryTheme> = {
  Sending: {
    categoryBadge:
      'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25',
    accentDot: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]',
    topGradient: 'from-blue-500/80 via-blue-400/40 to-blue-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-blue-50/30 dark:hover:from-slate-900/95 dark:hover:to-blue-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(59,130,246)]',
    pathRowBg: 'bg-blue-50/70 dark:bg-blue-950/35',
    pathText: 'text-blue-950 dark:text-blue-50',
    pathIcon: 'text-blue-600 dark:text-blue-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400',
  },
  Tracking: {
    categoryBadge:
      'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25',
    accentDot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
    topGradient: 'from-emerald-500/80 via-emerald-400/40 to-emerald-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-emerald-50/30 dark:hover:from-slate-900/95 dark:hover:to-emerald-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(16,185,129)]',
    pathRowBg: 'bg-emerald-50/70 dark:bg-emerald-950/35',
    pathText: 'text-emerald-950 dark:text-emerald-50',
    pathIcon: 'text-emerald-600 dark:text-emerald-400',
    linkHover:
      'group-hover/row:opacity-100 group-hover/row:text-emerald-600 dark:group-hover/row:text-emerald-400',
  },
  Journey: {
    categoryBadge:
      'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25',
    accentDot: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]',
    topGradient: 'from-violet-500/80 via-violet-400/40 to-violet-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-violet-50/30 dark:hover:from-slate-900/95 dark:hover:to-violet-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(139,92,246)]',
    pathRowBg: 'bg-violet-50/70 dark:bg-violet-950/35',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Subscribers: {
    categoryBadge:
      'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25',
    accentDot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    topGradient: 'from-amber-500/80 via-amber-400/40 to-amber-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-amber-50/30 dark:hover:from-slate-900/95 dark:hover:to-amber-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(245,158,11)]',
    pathRowBg: 'bg-amber-50/70 dark:bg-amber-950/35',
    pathText: 'text-amber-950 dark:text-amber-50',
    pathIcon: 'text-amber-600 dark:text-amber-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-amber-600 dark:group-hover/row:text-amber-400',
  },
  Subscription: {
    categoryBadge:
      'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25',
    accentDot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]',
    topGradient: 'from-rose-500/80 via-rose-400/40 to-rose-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-rose-50/30 dark:hover:from-slate-900/95 dark:hover:to-rose-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(244,63,94)]',
    pathRowBg: 'bg-rose-50/70 dark:bg-rose-950/35',
    pathText: 'text-rose-950 dark:text-rose-50',
    pathIcon: 'text-rose-600 dark:text-rose-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-rose-600 dark:group-hover/row:text-rose-400',
  },
  Automation: {
    categoryBadge:
      'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25',
    accentDot: 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]',
    topGradient: 'from-violet-500/80 via-violet-400/40 to-violet-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-violet-50/30 dark:hover:from-slate-900/95 dark:hover:to-violet-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(139,92,246)]',
    pathRowBg: 'bg-violet-50/70 dark:bg-violet-950/35',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Mobile: {
    categoryBadge:
      'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/25',
    accentDot: 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]',
    topGradient: 'from-cyan-500/80 via-cyan-400/40 to-cyan-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-cyan-50/30 dark:hover:from-slate-900/95 dark:hover:to-cyan-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(6,182,212)]',
    pathRowBg: 'bg-cyan-50/70 dark:bg-cyan-950/35',
    pathText: 'text-cyan-950 dark:text-cyan-50',
    pathIcon: 'text-cyan-600 dark:text-cyan-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-cyan-600 dark:group-hover/row:text-cyan-400',
  },
  GroupConnect: {
    categoryBadge:
      'bg-lime-50 text-lime-700 border-lime-200/60 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/25',
    accentDot: 'bg-lime-500 shadow-[0_0_6px_rgba(132,204,22,0.4)]',
    topGradient: 'from-lime-500/80 via-lime-400/40 to-lime-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-lime-50/30 dark:hover:from-slate-900/95 dark:hover:to-lime-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(132,204,22)]',
    pathRowBg: 'bg-lime-50/70 dark:bg-lime-950/35',
    pathText: 'text-lime-950 dark:text-lime-50',
    pathIcon: 'text-lime-600 dark:text-lime-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-lime-600 dark:group-hover/row:text-lime-400',
  },
  Social: {
    categoryBadge:
      'bg-pink-50 text-pink-700 border-pink-200/60 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/25',
    accentDot: 'bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.4)]',
    topGradient: 'from-pink-500/80 via-pink-400/40 to-pink-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-pink-50/30 dark:hover:from-slate-900/95 dark:hover:to-pink-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(236,72,153)]',
    pathRowBg: 'bg-pink-50/70 dark:bg-pink-950/35',
    pathText: 'text-pink-950 dark:text-pink-50',
    pathIcon: 'text-pink-600 dark:text-pink-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-pink-600 dark:group-hover/row:text-pink-400',
  },
  Other: {
    categoryBadge:
      'bg-stone-50 text-stone-700 border-stone-200/60 dark:bg-stone-500/10 dark:text-stone-400 dark:border-stone-500/25',
    accentDot: 'bg-stone-500 shadow-[0_0_6px_rgba(120,113,108,0.4)]',
    topGradient: 'from-stone-500/80 via-stone-400/40 to-stone-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-stone-50/30 dark:hover:from-slate-900/95 dark:hover:to-stone-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(120,113,108)]',
    pathRowBg: 'bg-stone-50/70 dark:bg-stone-950/35',
    pathText: 'text-stone-950 dark:text-stone-50',
    pathIcon: 'text-stone-600 dark:text-stone-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-stone-600 dark:group-hover/row:text-stone-400',
  },
  SendLog: {
    categoryBadge:
      'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/25',
    accentDot: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]',
    topGradient: 'from-orange-500/80 via-orange-400/40 to-orange-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-orange-50/30 dark:hover:from-slate-900/95 dark:hover:to-orange-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(249,115,22)]',
    pathRowBg: 'bg-orange-50/70 dark:bg-orange-950/35',
    pathText: 'text-orange-950 dark:text-orange-50',
    pathIcon: 'text-orange-600 dark:text-orange-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-orange-600 dark:group-hover/row:text-orange-400',
  },
  Synchronized: {
    categoryBadge:
      'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/25',
    accentDot: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]',
    topGradient: 'from-indigo-500/80 via-indigo-400/40 to-indigo-300/10',
    cardHover:
      'hover:bg-gradient-to-b hover:from-white/95 hover:to-indigo-50/30 dark:hover:from-slate-900/95 dark:hover:to-indigo-950/20',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(99,102,241)]',
    pathRowBg: 'bg-indigo-50/70 dark:bg-indigo-950/35',
    pathText: 'text-indigo-950 dark:text-indigo-50',
    pathIcon: 'text-indigo-600 dark:text-indigo-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400',
  },
};

const CARD_HEADER_HEIGHT = 'h-[5.5rem]';

/** Cards at or below this field count show a flex-grown empty-state panel */
const SPARSE_FIELD_THRESHOLD = 4;

const FIELD_COLUMN_HEADER_CLASS =
  'text-[10px] font-semibold uppercase tracking-wider text-slate-400/90 dark:text-slate-500/90';

const FIELD_EMPTY_PLACEHOLDER =
  'Custom Profile Attributes from your Enterprise 2.0 configuration will dynamically map here.';

const FIELD_GRID_COLS =
  'grid-cols-[minmax(0,1fr)_minmax(4.75rem,auto)_2.25rem]';

const TYPE_BADGE_CLASS =
  'inline-flex whitespace-nowrap rounded border border-slate-200/40 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 transition-colors duration-200 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-400';

const PK_ICON_CLASS = 'text-amber-500 transition-colors duration-100';

const FK_IDX_MARK_CLASS =
  'font-mono text-[9px] font-bold uppercase leading-none tracking-wide text-indigo-500 transition-colors duration-100';

const LINK_ICON_IDLE =
  'text-indigo-400/70 opacity-80 transition-all duration-100 dark:text-indigo-400/60';

/** Positions link icon in row padding without shifting field name text. */
const FIELD_LINK_ICON_CLASS = 'absolute left-0 top-0.5 z-[1] h-3.5 w-3.5 -translate-x-[calc(100%+0.25rem)]';

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
  const showSparseFieldPlaceholder = table.fields.length <= SPARSE_FIELD_THRESHOLD;

  return (
    <article
      className={`group/card flex h-[450px] max-h-[500px] flex-col overflow-hidden will-change-transform ${CARD_BASE_CLASS} ${theme.cardHover} ${
        isSelected
          ? 'shadow-[0_20px_40px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/8 ring-offset-2 ring-offset-slate-50 dark:shadow-[0_20px_40px_rgb(0,0,0,0.35)] dark:ring-white/10 dark:ring-offset-slate-950'
          : ''
      } ${isCardDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <div
        className={`h-1 w-full shrink-0 bg-gradient-to-r ${theme.topGradient}`}
        aria-hidden
      />

      <header
        className={`${CARD_HEADER_HEIGHT} flex shrink-0 flex-col justify-between border-b border-slate-100/80 px-4 py-3 transition-colors duration-300 group-hover/card:border-slate-200/60 dark:border-slate-800/60 dark:group-hover/card:border-slate-700/50`}
      >
        <div className="flex min-h-[1.5rem] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(table.name)}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 transition-all duration-200 ease-in-out hover:border-slate-400 focus:ring-2 focus:ring-slate-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              aria-label={`Include ${table.name} in SQL query`}
            />
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.accentDot}`}
              aria-hidden
            />
            <h2 className="truncate font-mono text-sm font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              {table.name}
            </h2>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${theme.categoryBadge}`}
          >
            {table.category}
          </span>
        </div>
        <p className="line-clamp-2 h-8 text-xs leading-4 text-slate-500 dark:text-slate-400">
          {table.description}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-transparent transition-colors duration-300">
        <div
          className={`grid shrink-0 gap-x-2 border-b border-slate-100/80 px-3 pb-1.5 pt-2 dark:border-slate-800/50 sm:px-4 ${FIELD_GRID_COLS}`}
          role="row"
        >
          <span className={`pl-0.5 ${FIELD_COLUMN_HEADER_CLASS}`} role="columnheader">
            Field
          </span>
          <span className={FIELD_COLUMN_HEADER_CLASS} role="columnheader">
            Type
          </span>
          <span className={`text-center ${FIELD_COLUMN_HEADER_CLASS}`} role="columnheader">
            PK
          </span>
        </div>

        <div
          className={`scrollbar-card-fields flex min-h-0 flex-1 flex-col overflow-x-hidden ${
            showSparseFieldPlaceholder ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
          role="table"
          aria-label={`${table.name} fields`}
        >
          <div className="shrink-0" role="rowgroup">
            {table.fields.map((field, fieldIndex) => (
              <FieldRow
                key={`${table.name}-${field.name}-${fieldIndex}`}
                tableName={table.name}
                field={field}
                categoryTheme={theme}
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
          </div>

          {showSparseFieldPlaceholder && (
            <div
              className="mx-3 mb-4 mt-2 flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200/60 bg-slate-50/40 px-6 py-8 text-center dark:border-slate-700/60 dark:bg-slate-900/30 sm:mx-4 sm:px-7 sm:py-9"
              role="status"
              aria-label={FIELD_EMPTY_PLACEHOLDER}
            >
              <Info
                className="mb-3 h-5 w-5 text-slate-300/90 dark:text-slate-600"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="max-w-[15.5rem] text-[12px] font-normal italic leading-relaxed text-slate-400/90 dark:text-slate-500/90">
                {FIELD_EMPTY_PLACEHOLDER}
              </p>
            </div>
          )}
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
  const isPathActive = isSource || isTargetGlow;
  const isRelationInteractive =
    !field.isDynamicProfileAttribute &&
    buildRelationHighlight(tableName, field, schemaTables) !== null;
  const isProfileAttribute = field.isDynamicProfileAttribute === true;
  const hasForeignKey = Boolean(field.relatesTo?.length);
  const showIndexedMark = field.isIndexed === true && !field.isPrimaryKey && !hasForeignKey;

  const fieldNameClass = isProfileAttribute
    ? 'italic font-medium tracking-tight text-slate-500 group-hover/row:text-slate-600 dark:text-slate-400 dark:group-hover/row:text-slate-300'
    : isPathActive
      ? categoryTheme.pathText
      : 'font-medium tracking-tight text-slate-800 group-hover/row:text-slate-900 dark:text-slate-200 dark:group-hover/row:text-white';

  const descriptionClass = isPathActive
    ? `${categoryTheme.pathText} opacity-80`
    : 'text-slate-500 group-hover/row:text-slate-600 dark:text-slate-400 dark:group-hover/row:text-slate-300';

  return (
    <div
      role="row"
      className={`group/row mx-1.5 grid gap-x-2 rounded-lg px-3 py-2.5 transition-[background-color,color,opacity] duration-200 ease-out sm:mx-2 ${FIELD_GRID_COLS} ${
        isPathActive
          ? `${categoryTheme.pathRowBg} ${categoryTheme.pathInset}`
          : 'even:bg-slate-50/30 odd:bg-transparent hover:bg-slate-50/80 dark:even:bg-slate-800/20 dark:odd:bg-transparent dark:hover:bg-slate-800/50'
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
          <span className="flex min-w-0 items-center gap-1">
            <span
              className={`truncate font-mono text-xs transition-colors duration-100 ${fieldNameClass}`}
            >
              {field.name}
            </span>
            {isProfileAttribute && <ProfileAttributeHelp />}
          </span>
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
              showDetails ? 'mt-1.5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <p className={`text-xs leading-relaxed transition-colors duration-100 ${descriptionClass}`}>
                {field.description}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div role="cell" className="self-start">
        {isProfileAttribute ? (
          <span className={`${TYPE_BADGE_CLASS} italic`}>dynamic</span>
        ) : (
          <span
            className={`${TYPE_BADGE_CLASS} ${
              isPathActive
                ? `${categoryTheme.pathText} bg-white/80 dark:bg-slate-900/80`
                : 'group-hover/row:bg-slate-200/60 group-hover/row:text-slate-500 dark:group-hover/row:bg-slate-700/60 dark:group-hover/row:text-slate-300'
            }`}
          >
            {formatFieldType(field)}
          </span>
        )}
      </div>
      <div role="cell" className="flex items-start justify-center self-start">
        {field.isPrimaryKey ? (
          <span className="inline-flex" title="Primary key">
            <KeyRound
              className={`h-3.5 w-3.5 ${
                isPathActive ? categoryTheme.pathIcon : PK_ICON_CLASS
              }`}
              aria-label="Primary key"
            />
          </span>
        ) : hasForeignKey ? (
          <span className={FK_IDX_MARK_CLASS} title="Foreign key">
            FK
          </span>
        ) : showIndexedMark ? (
          <span className={FK_IDX_MARK_CLASS} title="Indexed field">
            IDX
          </span>
        ) : isRelationInteractive ? (
          <span className={FK_IDX_MARK_CLASS} title="Relational join field">
            FK
          </span>
        ) : (
          <span className="inline-block h-3.5 w-3.5" aria-hidden />
        )}
      </div>
    </div>
  );
}
