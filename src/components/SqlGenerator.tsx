import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Braces,
  Calendar,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  FileText,
  GitBranch,
  Hash,
  Route,
  Shield,
  Terminal,
  Users,
} from 'lucide-react';
import type { DataViewTable } from '../data/sfmcSchema';
import {
  applySqlKeywordCase,
  applySqlUtilityFilters,
  applyTargetDeScaffolding,
  buildActiveSubscriberPredicate,
  generateSfmcSql,
  resolveFilterAlias,
  type SqlKeywordCase,
} from '../utils/sqlGenerator';
import { sfmcDataViews } from '../data/sfmcSchema';

const QUERY_STUDIO_TIP =
  'Quick tip: Copy the SQL below, adjust Job IDs and filters for your business unit, then run it in Query Studio or as a Query Activity in Automation Studio.';
const COPIED_FEEDBACK_MS = 2200;
/** Expanded drawer height — keep in sync with App canvas bottom padding. */
const SANDBOX_DRAWER_HEIGHT_PX = 450;
const SQL_EDITOR_MIN_HEIGHT_PX = 150;
const SQL_EDITOR_MAX_HEIGHT_PX = 350;

const GLASS_PANEL_CLASS =
  'rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/80';

const SECTION_LABEL_CLASS =
  'text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500';

const SECTION_TITLE_CLASS = 'text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-100';

const MONO_BADGE_CLASS =
  'font-mono text-[11px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded dark:bg-slate-800/80 dark:text-slate-500';

interface SqlGeneratorProps {
  selectedTableNames: string[];
  schemaTables?: DataViewTable[];
  sql: string;
  onSqlChange: (sql: string) => void;
  isVisible: boolean;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** When true, skip overwriting sql from card-driven generation (e.g. copilot apply). */
  preserveSql?: boolean;
}

function UtilityToggle({
  id,
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: typeof Calendar;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ease-out ${
        checked
          ? 'border-cyan-400/50 bg-cyan-50/80 shadow-[0_4px_12px_rgba(6,182,212,0.08)] dark:border-cyan-500/40 dark:bg-cyan-950/30'
          : 'border-slate-200/60 bg-white/60 hover:border-slate-300/60 hover:bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-900/40 dark:hover:border-slate-600/60 dark:hover:bg-slate-800/50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-800"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
          <Icon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden />
          {label}
        </span>
        <span className={`mt-1 block leading-snug ${MONO_BADGE_CLASS}`}>{description}</span>
      </span>
    </label>
  );
}

function CampaignJobIdFilter({
  checked,
  jobId,
  onCheckedChange,
  onJobIdChange,
  previewPredicate,
}: {
  checked: boolean;
  jobId: string;
  onCheckedChange: (value: boolean) => void;
  onJobIdChange: (value: string) => void;
  previewPredicate: string;
}) {
  return (
    <div
      className={`rounded-xl border transition-all duration-300 ease-out ${
        checked
          ? 'border-cyan-400/50 bg-cyan-50/80 shadow-[0_4px_12px_rgba(6,182,212,0.08)] dark:border-cyan-500/40 dark:bg-cyan-950/30'
          : 'border-slate-200/60 bg-white/60 hover:border-slate-300/60 hover:bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-900/40 dark:hover:border-slate-600/60 dark:hover:bg-slate-800/50'
      }`}
    >
      <label
        htmlFor="filter-campaign-job-id"
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
      >
        <input
          id="filter-campaign-job-id"
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-800"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            <Hash className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden />
            Filter by Campaign JobID
          </span>
          <span className={`mt-1 block leading-snug ${MONO_BADGE_CLASS}`}>{previewPredicate}</span>
        </span>
      </label>
      {checked && (
        <div className="border-t border-slate-200/60 px-3 pb-3 pt-2 dark:border-slate-700/50">
          <label htmlFor="campaign-job-id-value" className="sr-only">
            Campaign JobID
          </label>
          <input
            id="campaign-job-id-value"
            type="text"
            inputMode="numeric"
            value={jobId}
            onChange={(event) => onJobIdChange(event.target.value)}
            placeholder="e.g., 123456"
            className="w-full rounded-lg border border-slate-200/60 bg-white/90 px-2.5 py-1.5 font-mono text-xs text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-slate-400 transition-all duration-300 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      )}
    </div>
  );
}

function KeywordCaseToggle({
  value,
  onChange,
}: {
  value: SqlKeywordCase;
  onChange: (value: SqlKeywordCase) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/60 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/40">
      <div className="flex items-start gap-3">
        <CaseSensitive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Keyword case</p>
          <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
            Switch core SQL keywords between uppercase and lowercase in the output.
          </p>
          <div
            className="mt-2 inline-flex rounded-lg border border-slate-200/60 bg-slate-100/60 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-700/50 dark:bg-slate-800/60"
            role="group"
            aria-label="SQL keyword case"
          >
            <button
              type="button"
              onClick={() => onChange('upper')}
              aria-pressed={value === 'upper'}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                value === 'upper'
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              UPPERCASE
            </button>
            <button
              type="button"
              onClick={() => onChange('lower')}
              aria-pressed={value === 'lower'}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                value === 'lower'
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              lowercase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SqlGenerator({
  selectedTableNames,
  schemaTables,
  sql,
  onSqlChange,
  isVisible,
  isExpanded,
  onExpandedChange,
  preserveSql = false,
}: SqlGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [limitPast30Days, setLimitPast30Days] = useState(false);
  const [excludeTestSends, setExcludeTestSends] = useState(false);
  const [filterActiveSubscribersOnly, setFilterActiveSubscribersOnly] = useState(false);
  const [filterByCampaignJobId, setFilterByCampaignJobId] = useState(false);
  const [campaignJobId, setCampaignJobId] = useState('');
  const [includeTargetDeScaffolding, setIncludeTargetDeScaffolding] = useState(false);
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>('upper');
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);

  const schema = schemaTables ?? sfmcDataViews;

  const generation = useMemo(
    () =>
      generateSfmcSql(selectedTableNames, schemaTables, {
        requireSubscribersJoin: filterActiveSubscribersOnly,
      }),
    [selectedTableNames, schemaTables, filterActiveSubscribersOnly],
  );

  const {
    baseSql,
    bridgingTables,
    disconnectedTables,
    userSelectedTables,
    architecture,
    filterAlias,
    joinTables,
  } = generation;

  const subscribersInJoinPath = joinTables.includes('_Subscribers');

  const jobIdFilterAlias = useMemo(
    () => resolveFilterAlias(userSelectedTables, joinTables, schema, ['JobID']),
    [userSelectedTables, joinTables, schema],
  );

  const campaignJobIdActive =
    filterByCampaignJobId && campaignJobId.trim().length > 0;

  const filteredSql = useMemo(
    () =>
      applySqlUtilityFilters(
        baseSql,
        {
          limitPast30Days,
          excludeTestSends,
          filterActiveSubscribersOnly:
            filterActiveSubscribersOnly && subscribersInJoinPath,
          filterByCampaignJobId: campaignJobIdActive,
          campaignJobId,
          jobIdFilterAlias,
        },
        filterAlias,
        keywordCase,
      ),
    [
      baseSql,
      limitPast30Days,
      excludeTestSends,
      filterActiveSubscribersOnly,
      subscribersInJoinPath,
      campaignJobIdActive,
      campaignJobId,
      jobIdFilterAlias,
      filterAlias,
      keywordCase,
    ],
  );

  const casedSql = useMemo(
    () => applySqlKeywordCase(filteredSql, keywordCase),
    [filteredSql, keywordCase],
  );

  const displaySql = useMemo(
    () =>
      applyTargetDeScaffolding(
        casedSql,
        architecture.rootTable,
        keywordCase,
        includeTargetDeScaffolding,
      ),
    [casedSql, architecture.rootTable, keywordCase, includeTargetDeScaffolding],
  );

  const formatUtilityPreview = (expression: string) =>
    applySqlKeywordCase(expression, keywordCase);

  useEffect(() => {
    if (preserveSql || selectedTableNames.length === 0) {
      return;
    }
    onSqlChange(displaySql);
  }, [displaySql, onSqlChange, preserveSql, selectedTableNames.length]);

  const fieldsByTable = useMemo(() => {
    const groups = new Map<string, typeof architecture.selectFields>();
    for (const field of architecture.selectFields) {
      const existing = groups.get(field.table) ?? [];
      existing.push(field);
      groups.set(field.table, existing);
    }
    return groups;
  }, [architecture.selectFields]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  useLayoutEffect(() => {
    if (!isExpanded) {
      return;
    }

    const textarea = sqlTextareaRef.current;
    if (!textarea) {
      return;
    }

    const applyEditorHeight = () => {
      const isSideBySide = window.matchMedia('(min-width: 1024px)').matches;
      if (isSideBySide) {
        textarea.style.height = '';
        return;
      }

      textarea.style.height = '0px';
      const contentHeight = textarea.scrollHeight;
      const nextHeight = Math.min(
        SQL_EDITOR_MAX_HEIGHT_PX,
        Math.max(SQL_EDITOR_MIN_HEIGHT_PX, contentHeight),
      );
      textarea.style.height = `${nextHeight}px`;
    };

    applyEditorHeight();
    window.addEventListener('resize', applyEditorHeight);
    return () => window.removeEventListener('resize', applyEditorHeight);
  }, [sql, isExpanded]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!isVisible}
    >
      <div
        className="pointer-events-auto flex flex-col border-t border-slate-200/60 bg-white/90 shadow-[0_-8px_30px_rgb(0,0,0,0.04),0_-20px_40px_rgb(0,0,0,0.03)] backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-900/90 dark:shadow-[0_-8px_30px_rgb(0,0,0,0.25)]"
        style={{
          height: isExpanded ? `${SANDBOX_DRAWER_HEIGHT_PX}px` : 'auto',
          maxHeight: isExpanded ? `${SANDBOX_DRAWER_HEIGHT_PX}px` : '4.5rem',
        }}
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-cyan-400/70 via-blue-300/30 to-transparent" aria-hidden />

        <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col px-4 sm:px-6 lg:px-8">
          {/* Dashboard chrome — always visible */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100/80 py-3 dark:border-slate-800/60">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                <Terminal className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-slate-800 sm:text-base dark:text-slate-100">
                  SQL Sandbox
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {userSelectedTables.length} target
                  {userSelectedTables.length === 1 ? '' : 's'}
                  {architecture.joinSteps.length > 0 &&
                    ` · ${architecture.joinSteps.length} BFS join step${architecture.joinSteps.length === 1 ? '' : 's'}`}
                  {bridgingTables.length > 0 &&
                    ` · ${bridgingTables.length} bridge${bridgingTables.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
                  copied
                    ? 'border-emerald-300/60 bg-gradient-to-b from-emerald-50 to-emerald-100/80 text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.12)] focus:ring-emerald-500/40 dark:border-emerald-600/50 dark:from-emerald-950/50 dark:to-emerald-950/30 dark:text-emerald-200'
                    : 'border-cyan-300/50 bg-gradient-to-b from-cyan-50 to-white text-cyan-950 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(6,182,212,0.12)] focus:ring-cyan-500/40 dark:border-cyan-600/50 dark:from-cyan-950/40 dark:to-slate-900 dark:text-cyan-100'
                }`}
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Copy SQL</span>
                    <span className="sm:hidden">Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onExpandedChange(!isExpanded)}
                className="rounded-xl border border-slate-200/60 bg-white/90 p-2 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/60 hover:bg-slate-50 hover:text-slate-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse SQL sandbox' : 'Expand SQL sandbox'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4 pt-4">
              <p
                className="mb-4 shrink-0 rounded-xl border border-blue-200/60 bg-blue-50/80 p-3 text-[12px] leading-relaxed text-blue-800 backdrop-blur-sm dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                role="note"
              >
                <span className="mr-1" aria-hidden>
                  💡
                </span>
                {QUERY_STUDIO_TIP}
              </p>

              {(bridgingTables.length > 0 || disconnectedTables.length > 0) && (
                <div className="mb-4 shrink-0 space-y-2">
                  {bridgingTables.length > 0 && (
                    <div className="flex gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      <Route className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      <p>
                        <span className="font-semibold text-amber-800 dark:text-amber-200">Pathfinder bridges</span>
                        {' — '}
                        injected to connect your selection:{' '}
                        <span className="font-mono text-amber-900 dark:text-amber-50">
                          {bridgingTables.join(', ')}
                        </span>
                      </p>
                    </div>
                  )}
                  {disconnectedTables.length > 0 && (
                    <div className="rounded-xl border border-red-200/60 bg-red-50/80 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                      Unreachable from graph: {disconnectedTables.join(', ')}. Review join path below.
                    </div>
                  )}
                </div>
              )}

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
                {/* Left — query architecture & filters */}
                <aside className="scrollbar-card flex min-h-0 flex-col gap-4 lg:col-span-1 lg:overflow-y-auto">
                  <p className={SECTION_LABEL_CLASS}>Query architecture &amp; filters</p>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <Braces className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" aria-hidden />
                      SELECT fields
                      <span className={`ml-auto font-normal ${MONO_BADGE_CLASS}`}>
                        {architecture.selectFields.length}
                      </span>
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                      {[...fieldsByTable.entries()].map(([tableName, fields]) => (
                        <div key={tableName}>
                          <p className="font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                            {tableName}
                          </p>
                          <ul className="mt-0.5 space-y-0.5">
                            {fields.map((item) => (
                              <li
                                key={item.expression}
                                className="truncate rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-500 transition-colors hover:bg-slate-50/80 dark:text-slate-400 dark:hover:bg-slate-800/50"
                              >
                                {item.expression}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <Database className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" aria-hidden />
                      Base target (FROM)
                    </div>
                    {architecture.rootTable ? (
                      <p className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
                        {architecture.rootTable}{' '}
                        <span className="text-slate-400">AS</span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">{architecture.rootAlias}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">—</p>
                    )}
                  </section>

                  <section className={`${GLASS_PANEL_CLASS} p-3`}>
                    <div className={`mb-2 flex items-center gap-2 ${SECTION_TITLE_CLASS}`}>
                      <GitBranch className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" aria-hidden />
                      BFS join path
                    </div>
                    {architecture.joinSteps.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {architecture.rootTable
                          ? 'Single-table query — no joins required.'
                          : 'No joins.'}
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {architecture.joinSteps.map((step) => (
                          <li
                            key={`${step.order}-${step.table}`}
                            className="rounded-xl border border-slate-200/60 bg-white/60 px-2.5 py-2 dark:border-slate-700/50 dark:bg-slate-900/40"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {step.order}
                              </span>
                              <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                                {step.table}
                              </span>
                              {step.isBridgingTable && (
                                <span className="rounded-full bg-gradient-to-r from-amber-500/10 to-amber-400/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                  bridge
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-400">
                              ON {step.conditions.join(' AND ')}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="space-y-3">
                    <p className={SECTION_LABEL_CLASS}>Performance &amp; Formatting</p>
                    <div className="space-y-2">
                      <UtilityToggle
                        id="limit-30-days"
                        label="Limit past 30 days"
                        description={formatUtilityPreview(
                          filterAlias
                            ? `${filterAlias}.EventDate >= DATEADD(day, -30, GETDATE())`
                            : 'EventDate >= DATEADD(day, -30, GETDATE())',
                        )}
                        checked={limitPast30Days}
                        onChange={setLimitPast30Days}
                        icon={Calendar}
                      />
                      <UtilityToggle
                        id="exclude-test-sends"
                        label="Exclude test send records"
                        description={formatUtilityPreview(
                          filterAlias
                            ? `${filterAlias}.TestStormObjID IS NULL`
                            : 'TestStormObjID IS NULL',
                        )}
                        checked={excludeTestSends}
                        onChange={setExcludeTestSends}
                        icon={Shield}
                      />
                      <KeywordCaseToggle value={keywordCase} onChange={setKeywordCase} />
                      <UtilityToggle
                        id="include-target-de-scaffolding"
                        label="Include Automation Target Header"
                        description="Prepends target schema configurations and data binding rules."
                        checked={includeTargetDeScaffolding}
                        onChange={setIncludeTargetDeScaffolding}
                        icon={FileText}
                      />
                    </div>

                    <p className={`pt-1 ${SECTION_LABEL_CLASS}`}>Marketing Business Filters</p>
                    <div className="space-y-2">
                      <UtilityToggle
                        id="filter-active-subscribers"
                        label="Filter Active Subscribers Only"
                        description={formatUtilityPreview(
                          `AND ${buildActiveSubscriberPredicate(keywordCase)}`,
                        )}
                        checked={filterActiveSubscribersOnly}
                        onChange={setFilterActiveSubscribersOnly}
                        icon={Users}
                      />
                      {filterActiveSubscribersOnly && !subscribersInJoinPath && (
                        <p className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-[10px] leading-snug text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                          Could not auto-link <span className="font-mono">_Subscribers</span>{' '}
                          from the current selection. Choose a table with a subscriber join path.
                        </p>
                      )}
                      <CampaignJobIdFilter
                        checked={filterByCampaignJobId}
                        jobId={campaignJobId}
                        onCheckedChange={setFilterByCampaignJobId}
                        onJobIdChange={setCampaignJobId}
                        previewPredicate={formatUtilityPreview(
                          jobIdFilterAlias
                            ? `AND ${jobIdFilterAlias}.JobID = '${
                                campaignJobId.trim() || 'YOUR_ID'
                              }'`
                            : `AND JobID = '${campaignJobId.trim() || 'YOUR_ID'}'`,
                        )}
                      />
                    </div>
                  </section>
                </aside>

                {/* Right — SQL editor */}
                <section
                  className="flex min-h-[280px] flex-col lg:col-span-2 lg:min-h-0"
                  aria-label="SQL query editor"
                >
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-900/30">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800/20 bg-slate-900 shadow-[inset_0_2px_8px_rgb(0,0,0,0.15)] dark:border-slate-700/40">
                      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-3 py-2">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          query.sql
                        </span>
                        <div className="flex items-center gap-2">
                          {(limitPast30Days ||
                            excludeTestSends ||
                            (filterActiveSubscribersOnly && subscribersInJoinPath) ||
                            campaignJobIdActive ||
                            includeTargetDeScaffolding) && (
                            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                              utilities active
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={handleCopy}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${
                              copied
                                ? 'border-emerald-500/40 bg-emerald-600/90 text-white'
                                : 'border-slate-700/60 bg-slate-800/80 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white'
                            }`}
                            aria-live="polite"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden />
                                Copy SQL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={sqlTextareaRef}
                        value={sql}
                        onChange={(event) => onSqlChange(event.target.value)}
                        spellCheck={false}
                        rows={6}
                        className="scrollbar-card block w-full min-h-[150px] flex-1 resize-none overflow-y-auto bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500/30 max-h-[350px] lg:max-h-none sm:text-sm"
                        aria-label="SQL query editor"
                        placeholder="Select data views to generate SQL, or paste a query from AI Copilot…"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
