import { useEffect, useMemo, useState } from 'react';
import {
  Braces,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  GitBranch,
  Route,
  Shield,
  Terminal,
} from 'lucide-react';
import type { DataViewTable } from '../data/sfmcSchema';
import { applySqlUtilityFilters, generateSfmcSql } from '../utils/sqlGenerator';
import { SqlStyledCode } from './SqlStyledCode';

const COPIED_FEEDBACK_MS = 2200;

interface SqlGeneratorProps {
  selectedTableNames: string[];
  schemaTables?: DataViewTable[];
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
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        checked
          ? 'border-cyan-500/50 bg-cyan-950/40'
          : 'border-slate-700/80 bg-slate-800/40 hover:border-slate-600'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <Icon className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
          {label}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] leading-snug text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

export function SqlGenerator({
  selectedTableNames,
  schemaTables,
}: SqlGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [limitPast30Days, setLimitPast30Days] = useState(false);
  const [excludeTestSends, setExcludeTestSends] = useState(false);

  const generation = useMemo(
    () => generateSfmcSql(selectedTableNames, schemaTables),
    [selectedTableNames, schemaTables],
  );

  const {
    baseSql,
    bridgingTables,
    disconnectedTables,
    userSelectedTables,
    architecture,
    filterAlias,
  } = generation;

  const displaySql = useMemo(
    () =>
      applySqlUtilityFilters(baseSql, { limitPast30Days, excludeTestSends }, filterAlias),
    [baseSql, limitPast30Days, excludeTestSends, filterAlias],
  );

  const isVisible = selectedTableNames.length > 0;

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displaySql);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="pointer-events-auto border-t border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_-12px_48px_rgba(0,0,0,0.45)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Dashboard chrome */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                <Terminal className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">
                  SQL Sandbox
                </h2>
                <p className="truncate text-xs text-slate-400">
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
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  copied
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50 hover:bg-emerald-500'
                    : 'bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-400'
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
                onClick={() => setIsExpanded((value) => !value)}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
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

          <div
            className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-in-out ${
              isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="pb-5 pt-4">
                <div className="grid gap-4 lg:grid-cols-12">
                  {/* Architecture breakdown */}
                  <aside className="space-y-3 lg:col-span-4 xl:col-span-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Query architecture
                    </p>

                    {/* Fields */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Braces className="h-3.5 w-3.5 text-violet-400" aria-hidden />
                        SELECT fields
                        <span className="ml-auto font-mono text-[10px] font-normal text-slate-500">
                          {architecture.selectFields.length}
                        </span>
                      </div>
                      <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                        {[...fieldsByTable.entries()].map(([tableName, fields]) => (
                          <div key={tableName}>
                            <p className="font-mono text-[10px] font-semibold text-cyan-400/90">
                              {tableName}
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {fields.map((item) => (
                                <li
                                  key={item.expression}
                                  className="truncate font-mono text-[10px] text-slate-400"
                                >
                                  {item.expression}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Base target */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Database className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        Base target (FROM)
                      </div>
                      {architecture.rootTable ? (
                        <p className="font-mono text-sm text-emerald-300">
                          {architecture.rootTable}{' '}
                          <span className="text-slate-500">AS</span>{' '}
                          <span className="text-slate-300">{architecture.rootAlias}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">—</p>
                      )}
                    </section>

                    {/* JOIN steps */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <GitBranch className="h-3.5 w-3.5 text-amber-400" aria-hidden />
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
                              className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 font-mono text-[10px] text-slate-400">
                                  {step.order}
                                </span>
                                <span className="font-mono text-xs text-slate-200">
                                  {step.table}
                                </span>
                                {step.isBridgingTable && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                                    bridge
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-500">
                                ON {step.conditions.join(' AND ')}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>

                    {/* Utilities */}
                    <section className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        SQL utilities
                      </p>
                      <UtilityToggle
                        id="limit-30-days"
                        label="Limit past 30 days"
                        description={
                          filterAlias
                            ? `${filterAlias}.EventDate >= DATEADD(day, -30, GETDATE())`
                            : 'EventDate >= DATEADD(day, -30, GETDATE())'
                        }
                        checked={limitPast30Days}
                        onChange={setLimitPast30Days}
                        icon={Calendar}
                      />
                      <UtilityToggle
                        id="exclude-test-sends"
                        label="Exclude test send records"
                        description={
                          filterAlias
                            ? `${filterAlias}.TestStormObjID IS NULL`
                            : 'TestStormObjID IS NULL'
                        }
                        checked={excludeTestSends}
                        onChange={setExcludeTestSends}
                        icon={Shield}
                      />
                    </section>
                  </aside>

                  {/* SQL preview */}
                  <div className="flex min-h-0 flex-col lg:col-span-8 xl:col-span-9">
                    {(bridgingTables.length > 0 || disconnectedTables.length > 0) && (
                      <div className="mb-3 space-y-2">
                        {bridgingTables.length > 0 && (
                          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
                            <Route className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                            <p>
                              <span className="font-medium text-amber-200">Pathfinder bridges</span>
                              {' — '}
                              injected to connect your selection:{' '}
                              <span className="font-mono text-amber-50">
                                {bridgingTables.join(', ')}
                              </span>
                            </p>
                          </div>
                        )}
                        {disconnectedTables.length > 0 && (
                          <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                            Unreachable from graph: {disconnectedTables.join(', ')}. Review join
                            path above.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 shadow-inner ring-1 ring-white/5">
                      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          query.sql
                        </span>
                        {(limitPast30Days || excludeTestSends) && (
                          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                            filters active
                          </span>
                        )}
                      </div>
                      <div className="max-h-[min(22rem,45vh)] overflow-auto p-4">
                        <SqlStyledCode sql={displaySql} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
