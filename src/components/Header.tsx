import { useEffect, useId, useRef, useState } from 'react';
import {
  BookOpen,
  Copy,
  HelpCircle,
  Keyboard,
  Link2,
  ListTree,
  Moon,
  Search,
  Sparkles,
  Sun,
  Table2,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type HeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showDetails: boolean;
  onShowDetailsChange: (value: boolean) => void;
};

const GUIDE_SECTIONS = [
  {
    title: 'Schema explorer',
    icon: Table2,
    body: 'Browse every SFMC system data view with field types, primary keys, and inline descriptions. Category colors group Sending, Tracking, Journey, and related views at a glance.',
  },
  {
    title: 'Field search',
    icon: Search,
    body: 'Use the search bar to filter cards by field name (for example JobID or SubscriberKey). Matching fields stay visible; non-matching cards dim until they contain a hit.',
  },
  {
    title: 'Display details',
    icon: ListTree,
    body: 'Toggle Display Details in the header to expand every field row and show inline descriptions without leaving the schema grid.',
  },
  {
    title: 'Relationship highlights',
    icon: Link2,
    body: 'Hover a field that declares relatesTo links to highlight connected tables and join columns across the grid — useful when tracing multi-hop paths before writing SQL.',
  },
  {
    title: 'SQL generator',
    icon: Sparkles,
    body: 'Select one or more tables with the checkbox on each card. A docked panel builds JOIN SQL with BFS bridge tables when your selection spans disconnected views. Copy the query for Query Studio or Automation Studio.',
  },
] as const;

const SHORTCUTS = [
  { keys: ['Esc'], action: 'Close the user guide panel' },
  { keys: ['/'], action: 'Focus the field search input' },
  { keys: ['Ctrl', 'C'], action: 'Copy generated SQL (when the generator panel is open)' },
] as const;

export function Header({
  searchQuery,
  onSearchChange,
  showDetails,
  onShowDetailsChange,
}: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const guidePanelRef = useRef<HTMLDivElement>(null);
  const guideTitleId = useId();

  useEffect(() => {
    if (!isGuideOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGuideOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isGuideOpen]);

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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/85 dark:shadow-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                Salesforce Marketing Cloud
              </p>
              <h1 className="mt-0.5 truncate bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-slate-50 dark:via-slate-200 dark:to-cyan-300 sm:text-xl">
                SFMC Data Views Architect Pro
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => onShowDetailsChange(!showDetails)}
                aria-pressed={showDetails}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                  showDetails
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-200'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40'
                }`}
              >
                <ListTree className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Display details</span>
                <span className="sm:hidden">Details</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/50 dark:hover:text-cyan-100"
                aria-haspopup="dialog"
                aria-expanded={isGuideOpen}
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
                <span className="hidden sm:inline">User guide</span>
                <span className="sm:hidden">Help</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/40 dark:hover:text-amber-100"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="relative pb-4 sm:max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search fields — JobID, SubscriberKey…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-16 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-500 dark:focus:bg-slate-800"
              aria-label="Search fields by name"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500 sm:inline">
              /
            </kbd>
          </div>
        </div>
      </header>

      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity dark:bg-black/60"
            aria-label="Close user guide"
            onClick={() => setIsGuideOpen(false)}
          />

          <div
            ref={guidePanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={guideTitleId}
            className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <BookOpen className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 id={guideTitleId} className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    User guide
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    How to explore schemas and ship JOIN-ready SQL faster.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <section className="space-y-4">
                {GUIDE_SECTIONS.map(({ title, icon: Icon, body }) => (
                  <article
                    key={title}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                  </article>
                ))}
              </section>

              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Operational shortcuts
                  </h3>
                </div>
                <ul className="space-y-2">
                  {SHORTCUTS.map(({ keys, action }) => (
                    <li
                      key={action}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400">{action}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-8 rounded-xl border border-dashed border-cyan-300/60 bg-cyan-50/50 p-4 dark:border-cyan-800 dark:bg-cyan-950/30">
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
                  <Copy className="h-4 w-4" aria-hidden />
                  <h3 className="text-sm font-semibold">Query Studio tip</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-cyan-900/80 dark:text-cyan-200/80">
                  Paste generated SQL into an Automation Studio or Query Activity. Data views are read-only
                  system tables — always qualify names exactly as shown (including the leading underscore).
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
