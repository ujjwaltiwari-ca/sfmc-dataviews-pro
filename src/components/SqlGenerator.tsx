import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Route } from 'lucide-react';
import { generateSfmcSql } from '../utils/sqlGenerator';

const COPIED_FEEDBACK_MS = 2000;

interface SqlGeneratorProps {
  selectedTableNames: string[];
}

export function SqlGenerator({ selectedTableNames }: SqlGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const generation = useMemo(() => generateSfmcSql(selectedTableNames), [selectedTableNames]);

  const { sql, bridgingTables, disconnectedTables, userSelectedTables } = generation;

  const isVisible = selectedTableNames.length > 0;

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

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
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="pointer-events-auto border-t border-slate-700 bg-slate-900 shadow-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">SQL Query Generator</h2>
              <p className="truncate text-xs text-slate-400">
                {userSelectedTables.length} selected
                {bridgingTables.length > 0 &&
                  ` · ${bridgingTables.length} bridge${bridgingTables.length === 1 ? '' : 's'} injected`}
                {disconnectedTables.length > 0 &&
                  ` · ${disconnectedTables.length} unreachable`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((value) => !value)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse SQL panel' : 'Expand SQL panel'}
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
            className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
              isExpanded ? 'max-h-[28rem] pb-4' : 'max-h-0'
            }`}
          >
            {bridgingTables.length > 0 && (
              <div className="mb-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2.5 text-xs text-amber-100">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <div>
                  <p className="font-medium text-amber-200">Bridging tables added to SQL only</p>
                  <p className="mt-0.5 leading-relaxed text-amber-100/90">
                    Your checkboxes stay as selected ({userSelectedTables.join(', ')}). These
                    tables were inserted to complete the join path:{' '}
                    <span className="font-mono font-semibold text-amber-50">
                      {bridgingTables.join(', ')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {disconnectedTables.length > 0 && (
              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                No schema path connects: {disconnectedTables.join(', ')}. Partial SQL below.
              </div>
            )}

            <pre className="max-h-64 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300 sm:text-sm">
              <code>{sql}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
