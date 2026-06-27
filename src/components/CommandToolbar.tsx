import { useEffect, useRef, useState } from 'react';
import { Check, LayoutGrid, Link2, ListTree, RotateCcw, Search } from 'lucide-react';
import { type CanvasDensity } from '../constants/canvasDensity';
import { type BuContextMode } from '../constants/buContext';
import { VIEW_SEGMENTS, type ViewSegmentId } from '../data/viewSegments';
import { FOCUS_CANVAS_SEARCH_EVENT } from '../constants/siteChromeEvents';

const COPIED_FEEDBACK_MS = 2200;

type CommandToolbarProps = {
  activeSegment: ViewSegmentId;
  onSegmentChange: (segment: ViewSegmentId) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showDetails: boolean;
  onShowDetailsChange: (value: boolean) => void;
  canvasDensity: CanvasDensity;
  onCanvasDensityChange: (density: CanvasDensity) => void;
  buContext: BuContextMode;
  onBuContextChange: (mode: BuContextMode) => void;
  showEnterpriseBuToggle: boolean;
  canClearWorkspace: boolean;
  onClearWorkspace: () => void;
  onCopyWorkspaceLink: () => Promise<boolean>;
};

export function CommandToolbar({
  activeSegment,
  onSegmentChange,
  searchQuery,
  onSearchChange,
  showDetails,
  onShowDetailsChange,
  canvasDensity,
  onCanvasDensityChange,
  buContext,
  onBuContextChange,
  showEnterpriseBuToggle,
  canClearWorkspace,
  onClearWorkspace,
  onCopyWorkspaceLink,
}: CommandToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener(FOCUS_CANVAS_SEARCH_EVENT, handleFocusSearch);
    return () => window.removeEventListener(FOCUS_CANVAS_SEARCH_EVENT, handleFocusSearch);
  }, []);

  const handleCopyLink = async () => {
    const copied = await onCopyWorkspaceLink();
    if (!copied) {
      return;
    }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), COPIED_FEEDBACK_MS);
  };

  const densityToggleClass = (active: boolean) =>
    `rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:text-xs ${
      active
        ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="border-b border-slate-200/80 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80 dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <div className="relative shrink-0">
          <div
            className="flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-100/50 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-700/50 dark:bg-slate-800/40"
            role="tablist"
            aria-label="Schema canvas segments"
          >
            {VIEW_SEGMENTS.map((segment) => {
              const isActive = activeSegment === segment.id;
              return (
                <button
                  key={segment.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={segment.label}
                  onClick={() => onSegmentChange(segment.id)}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-300 ease-out sm:px-3 sm:py-2 sm:text-sm ${
                    isActive
                      ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:text-slate-50 dark:ring-slate-700/60'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-800 hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)] dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200'
                  }`}
                >
                  {segment.toolbarLabel}
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-slate-100/95 to-transparent dark:from-slate-800/95 sm:hidden"
            aria-hidden
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-72 lg:w-96">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tables or field:SubscriberID…"
              title="Tip: use field:SubscriberID to find all tables with that field"
              className="w-full rounded-xl border border-slate-200/60 bg-white/90 py-2 pl-10 pr-14 text-sm text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out placeholder:text-slate-400 hover:border-slate-300/60 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-cyan-500"
              aria-label="Search data view tables and fields by name"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500 sm:inline">
              /
            </kbd>
          </div>

          <div
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            role="group"
            aria-label="Canvas density"
          >
            <LayoutGrid className="ml-1.5 hidden h-3.5 w-3.5 text-slate-400 sm:inline" aria-hidden />
            <button
              type="button"
              className={densityToggleClass(canvasDensity === 'comfortable')}
              aria-pressed={canvasDensity === 'comfortable'}
              onClick={() => onCanvasDensityChange('comfortable')}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={densityToggleClass(canvasDensity === 'compact')}
              aria-pressed={canvasDensity === 'compact'}
              onClick={() => onCanvasDensityChange('compact')}
            >
              Compact
            </button>
          </div>

          {showEnterpriseBuToggle ? (
            <div
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              role="group"
              aria-label="BU Context"
            >
              <button
                type="button"
                className={densityToggleClass(buContext === 'child')}
                aria-pressed={buContext === 'child'}
                onClick={() => onBuContextChange('child')}
              >
                Child BU
              </button>
              <button
                type="button"
                className={densityToggleClass(buContext === 'enterprise')}
                aria-pressed={buContext === 'enterprise'}
                onClick={() => onBuContextChange('enterprise')}
              >
                Enterprise BU
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-200/80 bg-cyan-50/80 px-3 py-2 text-xs font-semibold text-cyan-900 shadow-sm transition-all duration-200 ease-in-out hover:border-cyan-300 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-100 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/60 sm:text-sm"
            title="Copy a shareable link with your current table selections and sandbox settings"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : (
              <Link2 className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="hidden sm:inline">{linkCopied ? 'Link copied' : 'Copy link'}</span>
            <span className="sm:hidden">{linkCopied ? 'Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={onClearWorkspace}
            disabled={!canClearWorkspace}
            title={
              canClearWorkspace
                ? 'Clear table selections, sandbox settings, and URL parameters (like a fresh visit)'
                : 'Nothing to clear — workspace is already at defaults'
            }
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 sm:text-sm ${
              canClearWorkspace
                ? 'border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-slate-300/80 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
                : 'cursor-not-allowed border-slate-200/50 bg-slate-50 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600'
            }`}
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Clear workspace</span>
            <span className="sm:hidden">Clear</span>
          </button>

          <label
            className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-200 ease-in-out ${
              showDetails
                ? 'border-indigo-300/80 bg-indigo-50 shadow-sm dark:border-indigo-600/60 dark:bg-indigo-950/50'
                : 'border-slate-200/80 bg-white shadow-sm hover:border-slate-300/80 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
            }`}
          >
            <ListTree className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
              Expand field details
            </span>
            <span className="relative inline-flex h-6 w-11 shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={showDetails}
                onChange={(event) => onShowDetailsChange(event.target.checked)}
              />
              <span
                className="block h-6 w-11 rounded-full bg-slate-200 transition-all duration-200 ease-in-out peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40 dark:bg-slate-700 dark:peer-checked:bg-indigo-500"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-in-out peer-checked:translate-x-5 dark:bg-slate-200"
                aria-hidden
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
