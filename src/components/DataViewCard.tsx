import { KeyRound, Link2 } from 'lucide-react';
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
  badgeBorder: string;
  badgeBg: string;
  cardHover: string;
  pathInset: string;
  pathRowBg: string;
  pathText: string;
  pathIcon: string;
  linkHover: string;
};

const categoryThemes: Record<DataViewCategory, CategoryTheme> = {
  Sending: {
    badgeBorder: 'border-blue-500/25',
    badgeBg: 'bg-blue-500/[0.05] dark:bg-blue-500/10',
    cardHover:
      'hover:border-blue-200/60 hover:bg-gradient-to-b hover:from-white hover:to-blue-50/40 hover:shadow-[0_14px_44px_-10px_rgba(59,130,246,0.14)] dark:hover:border-blue-500/20 dark:hover:from-slate-900 dark:hover:to-blue-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(59,130,246,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(59,130,246)]',
    pathRowBg: 'bg-blue-50/70 dark:bg-blue-950/35',
    pathText: 'text-blue-950 dark:text-blue-50',
    pathIcon: 'text-blue-600 dark:text-blue-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400',
  },
  Tracking: {
    badgeBorder: 'border-emerald-500/25',
    badgeBg: 'bg-emerald-500/[0.05] dark:bg-emerald-500/10',
    cardHover:
      'hover:border-emerald-200/60 hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/40 hover:shadow-[0_14px_44px_-10px_rgba(16,185,129,0.14)] dark:hover:border-emerald-500/20 dark:hover:from-slate-900 dark:hover:to-emerald-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(16,185,129,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(16,185,129)]',
    pathRowBg: 'bg-emerald-50/70 dark:bg-emerald-950/35',
    pathText: 'text-emerald-950 dark:text-emerald-50',
    pathIcon: 'text-emerald-600 dark:text-emerald-400',
    linkHover:
      'group-hover/row:opacity-100 group-hover/row:text-emerald-600 dark:group-hover/row:text-emerald-400',
  },
  Journey: {
    badgeBorder: 'border-violet-500/25',
    badgeBg: 'bg-violet-500/[0.05] dark:bg-violet-500/10',
    cardHover:
      'hover:border-violet-200/60 hover:bg-gradient-to-b hover:from-white hover:to-violet-50/40 hover:shadow-[0_14px_44px_-10px_rgba(139,92,246,0.14)] dark:hover:border-violet-500/20 dark:hover:from-slate-900 dark:hover:to-violet-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(139,92,246,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(139,92,246)]',
    pathRowBg: 'bg-violet-50/70 dark:bg-violet-950/35',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Subscribers: {
    badgeBorder: 'border-amber-500/25',
    badgeBg: 'bg-amber-500/[0.05] dark:bg-amber-500/10',
    cardHover:
      'hover:border-amber-200/60 hover:bg-gradient-to-b hover:from-white hover:to-amber-50/40 hover:shadow-[0_14px_44px_-10px_rgba(245,158,11,0.14)] dark:hover:border-amber-500/20 dark:hover:from-slate-900 dark:hover:to-amber-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(245,158,11,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(245,158,11)]',
    pathRowBg: 'bg-amber-50/70 dark:bg-amber-950/35',
    pathText: 'text-amber-950 dark:text-amber-50',
    pathIcon: 'text-amber-600 dark:text-amber-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-amber-600 dark:group-hover/row:text-amber-400',
  },
  Subscription: {
    badgeBorder: 'border-rose-500/25',
    badgeBg: 'bg-rose-500/[0.05] dark:bg-rose-500/10',
    cardHover:
      'hover:border-rose-200/60 hover:bg-gradient-to-b hover:from-white hover:to-rose-50/40 hover:shadow-[0_14px_44px_-10px_rgba(244,63,94,0.14)] dark:hover:border-rose-500/20 dark:hover:from-slate-900 dark:hover:to-rose-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(244,63,94,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(244,63,94)]',
    pathRowBg: 'bg-rose-50/70 dark:bg-rose-950/35',
    pathText: 'text-rose-950 dark:text-rose-50',
    pathIcon: 'text-rose-600 dark:text-rose-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-rose-600 dark:group-hover/row:text-rose-400',
  },
  Automation: {
    badgeBorder: 'border-violet-500/25',
    badgeBg: 'bg-violet-500/[0.05] dark:bg-violet-500/10',
    cardHover:
      'hover:border-violet-200/60 hover:bg-gradient-to-b hover:from-white hover:to-violet-50/40 hover:shadow-[0_14px_44px_-10px_rgba(139,92,246,0.14)] dark:hover:border-violet-500/20 dark:hover:from-slate-900 dark:hover:to-violet-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(139,92,246,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(139,92,246)]',
    pathRowBg: 'bg-violet-50/70 dark:bg-violet-950/35',
    pathText: 'text-violet-950 dark:text-violet-50',
    pathIcon: 'text-violet-600 dark:text-violet-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-400',
  },
  Mobile: {
    badgeBorder: 'border-cyan-500/25',
    badgeBg: 'bg-cyan-500/[0.05] dark:bg-cyan-500/10',
    cardHover:
      'hover:border-cyan-200/60 hover:bg-gradient-to-b hover:from-white hover:to-cyan-50/40 hover:shadow-[0_14px_44px_-10px_rgba(6,182,212,0.14)] dark:hover:border-cyan-500/20 dark:hover:from-slate-900 dark:hover:to-cyan-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(6,182,212,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(6,182,212)]',
    pathRowBg: 'bg-cyan-50/70 dark:bg-cyan-950/35',
    pathText: 'text-cyan-950 dark:text-cyan-50',
    pathIcon: 'text-cyan-600 dark:text-cyan-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-cyan-600 dark:group-hover/row:text-cyan-400',
  },
  GroupConnect: {
    badgeBorder: 'border-lime-500/25',
    badgeBg: 'bg-lime-500/[0.05] dark:bg-lime-500/10',
    cardHover:
      'hover:border-lime-200/60 hover:bg-gradient-to-b hover:from-white hover:to-lime-50/40 hover:shadow-[0_14px_44px_-10px_rgba(132,204,22,0.14)] dark:hover:border-lime-500/20 dark:hover:from-slate-900 dark:hover:to-lime-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(132,204,22,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(132,204,22)]',
    pathRowBg: 'bg-lime-50/70 dark:bg-lime-950/35',
    pathText: 'text-lime-950 dark:text-lime-50',
    pathIcon: 'text-lime-600 dark:text-lime-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-lime-600 dark:group-hover/row:text-lime-400',
  },
  Social: {
    badgeBorder: 'border-pink-500/25',
    badgeBg: 'bg-pink-500/[0.05] dark:bg-pink-500/10',
    cardHover:
      'hover:border-pink-200/60 hover:bg-gradient-to-b hover:from-white hover:to-pink-50/40 hover:shadow-[0_14px_44px_-10px_rgba(236,72,153,0.14)] dark:hover:border-pink-500/20 dark:hover:from-slate-900 dark:hover:to-pink-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(236,72,153,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(236,72,153)]',
    pathRowBg: 'bg-pink-50/70 dark:bg-pink-950/35',
    pathText: 'text-pink-950 dark:text-pink-50',
    pathIcon: 'text-pink-600 dark:text-pink-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-pink-600 dark:group-hover/row:text-pink-400',
  },
  Other: {
    badgeBorder: 'border-stone-500/25',
    badgeBg: 'bg-stone-500/[0.05] dark:bg-stone-500/10',
    cardHover:
      'hover:border-stone-300/60 hover:bg-gradient-to-b hover:from-white hover:to-stone-50/40 hover:shadow-[0_14px_44px_-10px_rgba(120,113,108,0.12)] dark:hover:border-stone-500/20 dark:hover:from-slate-900 dark:hover:to-stone-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(120,113,108,0.15)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(120,113,108)]',
    pathRowBg: 'bg-stone-50/70 dark:bg-stone-950/35',
    pathText: 'text-stone-950 dark:text-stone-50',
    pathIcon: 'text-stone-600 dark:text-stone-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-stone-600 dark:group-hover/row:text-stone-400',
  },
  SendLog: {
    badgeBorder: 'border-orange-500/25',
    badgeBg: 'bg-orange-500/[0.05] dark:bg-orange-500/10',
    cardHover:
      'hover:border-orange-200/60 hover:bg-gradient-to-b hover:from-white hover:to-orange-50/40 hover:shadow-[0_14px_44px_-10px_rgba(249,115,22,0.14)] dark:hover:border-orange-500/20 dark:hover:from-slate-900 dark:hover:to-orange-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(249,115,22,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(249,115,22)]',
    pathRowBg: 'bg-orange-50/70 dark:bg-orange-950/35',
    pathText: 'text-orange-950 dark:text-orange-50',
    pathIcon: 'text-orange-600 dark:text-orange-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-orange-600 dark:group-hover/row:text-orange-400',
  },
  Synchronized: {
    badgeBorder: 'border-indigo-500/25',
    badgeBg: 'bg-indigo-500/[0.05] dark:bg-indigo-500/10',
    cardHover:
      'hover:border-indigo-200/60 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/40 hover:shadow-[0_14px_44px_-10px_rgba(99,102,241,0.14)] dark:hover:border-indigo-500/20 dark:hover:from-slate-900 dark:hover:to-indigo-950/25 dark:hover:shadow-[0_14px_44px_-10px_rgba(99,102,241,0.2)]',
    pathInset: 'shadow-[inset_3px_0_0_0_rgb(99,102,241)]',
    pathRowBg: 'bg-indigo-50/70 dark:bg-indigo-950/35',
    pathText: 'text-indigo-950 dark:text-indigo-50',
    pathIcon: 'text-indigo-600 dark:text-indigo-400',
    linkHover: 'group-hover/row:opacity-100 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400',
  },
};

const CARD_HEADER_HEIGHT = 'h-[5.5rem]';

const FIELD_GRID_COLS =
  'grid-cols-[minmax(0,1fr)_minmax(4.75rem,auto)_2.25rem]';

const TYPE_BADGE_CLASS =
  'inline-flex whitespace-nowrap rounded border border-slate-200/60 bg-white px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide text-slate-600 transition-colors duration-100 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-400';

const MUTED_ICON = 'text-slate-400 transition-colors duration-100 dark:text-slate-500';

const LINK_ICON_IDLE =
  'opacity-25 text-slate-300 transition-all duration-100 dark:text-slate-600';

/** Positions link icon in row padding without shifting field name text. */
const FIELD_LINK_ICON_CLASS = 'absolute left-0 top-0.5 z-[1] h-3.5 w-3.5 -translate-x-[calc(100%+0.25rem)]';

const CARD_MOTION =
  'transition-[transform,box-shadow,background-color,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]';

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
      data-table-card={table.name}
      className={`group/card flex h-[450px] max-h-[500px] flex-col overflow-hidden rounded-lg border border-slate-200/50 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] will-change-transform hover:-translate-y-1 dark:border-slate-800/50 dark:bg-slate-900 dark:shadow-black/20 ${CARD_MOTION} ${theme.cardHover} ${
        isSelected
          ? 'border-slate-300/80 ring-1 ring-slate-900/10 ring-offset-2 ring-offset-[#f8fafc] dark:border-slate-600 dark:ring-white/10 dark:ring-offset-slate-950'
          : ''
      } ${isCardDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <header
        className={`${CARD_HEADER_HEIGHT} flex shrink-0 flex-col justify-between border-b border-slate-100 px-4 py-3 transition-colors duration-500 group-hover/card:border-slate-200/80 dark:border-slate-800 dark:group-hover/card:border-slate-700/80`}
      >
        <div className="flex min-h-[1.5rem] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(table.name)}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              aria-label={`Include ${table.name} in SQL query`}
            />
            <h2 className="truncate font-mono text-sm font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
              {table.name}
            </h2>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 ${theme.badgeBorder} ${theme.badgeBg}`}
          >
            {table.category}
          </span>
        </div>
        <p className="line-clamp-2 h-8 text-xs leading-4 text-slate-500 dark:text-slate-400">
          {table.description}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50 transition-colors duration-500 group-hover/card:bg-slate-50/30 dark:bg-slate-950/25 dark:group-hover/card:bg-slate-950/15">
        <div
          className={`grid shrink-0 gap-x-2 border-b border-slate-100/80 px-3 pb-1 pt-2 dark:border-slate-800/80 sm:px-4 ${FIELD_GRID_COLS}`}
          role="row"
        >
          <span
            className="pl-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            role="columnheader"
          >
            Field
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            role="columnheader"
          >
            Type
          </span>
          <span
            className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            role="columnheader"
          >
            PK
          </span>
        </div>

        <div
          className="scrollbar-card-fields min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          role="table"
          aria-label={`${table.name} fields`}
        >
          <div role="rowgroup">
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

  const fieldNameClass = isProfileAttribute
    ? 'italic text-slate-500 group-hover/row:text-slate-600 dark:text-slate-400 dark:group-hover/row:text-slate-300'
    : isPathActive
      ? categoryTheme.pathText
      : 'text-slate-800 group-hover/row:text-slate-950 dark:text-slate-200 dark:group-hover/row:text-white';

  const descriptionClass = isPathActive
    ? `${categoryTheme.pathText} opacity-80`
    : 'text-slate-500 group-hover/row:text-slate-600 dark:text-slate-400 dark:group-hover/row:text-slate-300';

  return (
    <div
      role="row"
      className={`group/row grid gap-x-2 border-b border-slate-100/80 px-3 py-2.5 transition-[background-color,color,opacity] duration-100 ease-out last:border-b-0 dark:border-slate-800/50 sm:px-4 ${FIELD_GRID_COLS} ${
        isPathActive
          ? `${categoryTheme.pathRowBg} ${categoryTheme.pathInset}`
          : 'bg-transparent hover:bg-white dark:hover:bg-slate-900/80'
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
              className={`truncate font-mono text-xs font-medium transition-colors duration-100 ${fieldNameClass}`}
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
                ? `${categoryTheme.pathText} border-current/20 bg-white/80 dark:bg-slate-900/80`
                : 'group-hover/row:border-slate-300 group-hover/row:text-slate-700 dark:group-hover/row:text-slate-200'
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
              className={`h-3.5 w-3.5 transition-colors duration-100 ${
                isPathActive ? categoryTheme.pathIcon : MUTED_ICON
              }`}
              aria-label="Primary key"
            />
          </span>
        ) : (
          <span className="inline-block h-3.5 w-3.5" aria-hidden />
        )}
      </div>
    </div>
  );
}
