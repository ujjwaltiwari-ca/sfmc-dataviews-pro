import { useEffect, useId, useRef, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  CircleHelp,
  ExternalLink,
  Info,
  Keyboard,
  Lightbulb,
  Link2,
  Moon,
  Search,
  Sparkles,
  Sun,
  Table2,
  Terminal,
  X,
  Zap,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AccountProfileDropdown } from './AccountProfileDropdown';
import { PlatformInfoModal } from './PlatformInfoModal';
import { SchemaArchitectMark } from './SchemaArchitectMark';
import {
  OPEN_DOCUMENTATION_EVENT,
  OPEN_ONBOARDING_TOUR_EVENT,
  OPEN_PLATFORM_INFO_EVENT,
} from '../constants/siteChromeEvents';

const GUIDE_WORKFLOW = [
  {
    title: 'Explore the schema canvas',
    icon: Table2,
    body: 'Data Views are system tables that expose subscribers, sends, tracking, journeys, and more. Browse cards by segment, inspect field types, and trace primary keys without leaving the workspace.',
  },
  {
    title: 'Search across every table',
    icon: Search,
    body: 'Type a field name (for example JobID or SubscriberKey) in the command toolbar. Matching tables stay in focus; unrelated cards fade so you can spot where a column lives instantly.',
  },
  {
    title: 'Expand field details',
    icon: Sparkles,
    body: 'Enable Expand Field Details to reveal inline descriptions and datatype badges on every row — the fastest way to validate a query before you write it.',
  },
  {
    title: 'Highlight relationships',
    icon: Link2,
    body: 'Hover any field with join metadata to cross-highlight linked tables and foreign keys across the grid. Perfect for planning multi-hop JOIN paths.',
  },
  {
    title: 'Build SQL in the Sandbox',
    icon: Terminal,
    body: 'Check tables to include, then use the SQL Sandbox for BFS join paths, bridge tables, and one-click copy into Automation Studio or Query Studio. If a query times out, narrow the date range with sandbox utilities.',
  },
  {
    title: 'Select tables for SQL',
    icon: CheckSquare,
    body: 'When selections do not share direct keys, the pathfinder injects bridge tables automatically in the JOIN section — your checkboxes stay limited to what you chose.',
  },
] as const;

const PRO_TIPS = [
  {
    icon: ZoomOut,
    title: 'Card zoom / scale',
    body: 'Pro-tip: Press Ctrl + minus (-) to zoom out your browser layout and see more data views on your screen simultaneously. On Mac, use ⌘ + minus.',
  },
  {
    icon: Lightbulb,
    title: 'Query performance',
    body: 'Large joins against _Open or _Click can time out in Query Studio. Use the Sandbox “Limit past 30 days” utility or filter on EventDate early.',
  },
] as const;

const SHORTCUTS = [
  { keys: ['Esc'], action: 'Close documentation panel' },
  { keys: ['/'], action: 'Focus field search' },
  { keys: ['Ctrl', 'C'], action: 'Copy SQL from Sandbox (when open)' },
] as const;

type HeaderProps = {
  onToggleCopilot: () => void;
  isCopilotOpen?: boolean;
  onSignInRequired?: () => void;
  onOpenSqlTemplates?: () => void;
  onStartOnboardingTour?: () => void;
};

export function Header({
  onToggleCopilot,
  isCopilotOpen = false,
  onSignInRequired,
  onOpenSqlTemplates,
  onStartOnboardingTour,
}: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthLoading } = useAuth();
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isPlatformInfoOpen, setIsPlatformInfoOpen] = useState(false);
  const docsPanelRef = useRef<HTMLDivElement>(null);
  const docsTitleId = useId();

  useEffect(() => {
    if (!isDocsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDocsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDocsOpen]);

  useEffect(() => {
    const handleOpenDocumentation = () => setIsDocsOpen(true);
    const handleOpenPlatformInfo = () => setIsPlatformInfoOpen(true);
    const handleOpenOnboardingTour = () => onStartOnboardingTour?.();

    window.addEventListener(OPEN_DOCUMENTATION_EVENT, handleOpenDocumentation);
    window.addEventListener(OPEN_PLATFORM_INFO_EVENT, handleOpenPlatformInfo);
    window.addEventListener(OPEN_ONBOARDING_TOUR_EVENT, handleOpenOnboardingTour);

    return () => {
      window.removeEventListener(OPEN_DOCUMENTATION_EVENT, handleOpenDocumentation);
      window.removeEventListener(OPEN_PLATFORM_INFO_EVENT, handleOpenPlatformInfo);
      window.removeEventListener(OPEN_ONBOARDING_TOUR_EVENT, handleOpenOnboardingTour);
    };
  }, [onStartOnboardingTour]);

  return (
    <>
      <header className="relative overflow-visible border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(6,182,212,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(6,182,212,0.08),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 md:gap-4">
            <a
              href="/"
              className="group flex min-w-0 flex-1 items-center gap-2 md:gap-3 sm:max-w-[55%] md:max-w-none lg:max-w-none"
            >
              <SchemaArchitectMark className="h-8 w-8 shrink-0 rounded-xl shadow-lg shadow-cyan-500/25 ring-1 ring-slate-900/5 transition-transform duration-200 ease-in-out group-hover:scale-[1.02] sm:h-10 sm:w-10 dark:ring-white/15" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-bold tracking-wider text-slate-900 dark:text-white md:text-base">
                  DataViews.pro
                </h1>
                <p className="hidden truncate text-xs text-slate-500 sm:inline-block dark:text-slate-400">
                  SFMC Schema Architect
                </p>
              </div>
            </a>

            <nav
              className="relative z-50 flex shrink-0 items-center gap-2 md:gap-4"
              aria-label="Global"
            >
              <button
                type="button"
                onClick={onToggleCopilot}
                aria-pressed={isCopilotOpen}
                aria-expanded={isCopilotOpen}
                className={`btn-nav btn-nav-violet ${
                  isCopilotOpen ? 'btn-nav-violet-active' : ''
                }`}
              >
                <Sparkles
                  className={`h-4 w-4 ${isCopilotOpen ? 'text-violet-600 dark:text-violet-400' : 'text-violet-500 dark:text-violet-400'}`}
                  aria-hidden
                />
                <span className="hidden sm:inline">AI Copilot</span>
                <span className="sm:hidden">AI</span>
              </button>

              {!isAuthLoading && user ? (
                <AccountProfileDropdown onSignedOut={onSignInRequired} />
              ) : null}

              <button
                type="button"
                onClick={() => setIsDocsOpen(true)}
                className="btn-nav btn-nav-cyan"
                aria-haspopup="dialog"
                aria-expanded={isDocsOpen}
              >
                <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
                <span className="hidden sm:inline">Documentation &amp; User Guide</span>
                <span className="sm:hidden">Docs</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSqlTemplates?.()}
                className="btn-nav btn-nav-amber"
              >
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                <span className="hidden sm:inline">SQL Templates</span>
                <span className="sm:hidden">Templates</span>
              </button>

              <button
                type="button"
                onClick={() => onStartOnboardingTour?.()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white/90 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-50/80 hover:text-cyan-800 hover:shadow-[0_8px_20px_rgba(6,182,212,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-cyan-600/50 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-200"
                aria-label="Start 60-second onboarding tour"
                title="60-Second Onboarding Tour"
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setIsPlatformInfoOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white/90 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/80 hover:bg-slate-50 hover:text-slate-700 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-600/60 dark:hover:bg-slate-800/90 dark:hover:text-slate-200"
                aria-haspopup="dialog"
                aria-expanded={isPlatformInfoOpen}
                aria-label="Platform Info & Credits"
                title="Platform Info & Credits"
              >
                <Info className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white/90 text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-gradient-to-b hover:from-amber-50/80 hover:to-white hover:text-amber-900 hover:shadow-[0_8px_20px_rgba(245,158,11,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-amber-500/50 dark:hover:from-amber-950/40 dark:hover:to-slate-900 dark:hover:text-amber-100"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <PlatformInfoModal isOpen={isPlatformInfoOpen} onClose={() => setIsPlatformInfoOpen(false)} />

      {isDocsOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            aria-label="Close documentation"
            onClick={() => setIsDocsOpen(false)}
          />

          <div
            ref={docsPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={docsTitleId}
            className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="border-b border-slate-200 bg-gradient-to-r from-cyan-50/80 to-white px-6 py-5 dark:border-slate-800 dark:from-cyan-950/40 dark:to-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                    SFMC Schema Architect
                  </p>
                  <h2 id={docsTitleId} className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    Documentation &amp; User Guide
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Workspace instructions inspired by the DataViews.pro workflow — redesigned for this
                    open-source architect.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDocsOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition-all duration-200 ease-in-out hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close panel"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  How to use the workspace
                </h3>
                {GUIDE_WORKFLOW.map(({ title, icon: Icon, body }) => (
                  <article
                    key={title}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 ease-in-out hover:border-slate-300/80 hover:shadow-card dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                  </article>
                ))}
              </section>

              <section className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Layout &amp; canvas
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">Pro-tip:</strong>{' '}
                    Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">Ctrl</kbd>{' '}
                    + <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">minus (-)</kbd>{' '}
                    to zoom out your browser layout and see more data views on your screen simultaneously.
                  </li>
                </ul>
              </section>

              <section className="mt-8 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pro-tips
                </h3>
                {PRO_TIPS.map(({ title, icon: Icon, body }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </section>

              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-slate-500" aria-hidden />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Keyboard shortcuts
                  </h3>
                </div>
                <ul className="space-y-2">
                  {SHORTCUTS.map(({ keys, action }) => (
                    <li
                      key={action}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400">{action}</span>
                      <span className="flex gap-1">
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium dark:border-slate-700 dark:bg-slate-800"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="mt-8 flex items-center gap-2 text-xs text-slate-500">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Field descriptions align with official SFMC Data View documentation.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
