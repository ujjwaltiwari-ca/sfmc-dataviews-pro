import { useEffect, useId, useRef, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  ExternalLink,
  Keyboard,
  Lightbulb,
  Link2,
  Lock,
  Moon,
  Save,
  Search,
  Sparkles,
  Sun,
  Table2,
  Terminal,
  X,
  Zap,
  LayoutGrid,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/authContext.shared';
import { useTheme } from '../context/ThemeContext';
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand';
import { DAILY_COPILOT_QUERY_LIMIT } from '../constants/copilotQuota';
import { AccountProfileDropdown } from './AccountProfileDropdown';
import { PlatformInfoModal } from './PlatformInfoModal';
import { SchemaArchitectMark } from './SchemaArchitectMark';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  OPEN_DOCUMENTATION_EVENT,
  OPEN_PLATFORM_INFO_EVENT,
} from '../constants/siteChromeEvents';

const GUIDE_WORKFLOW = [
  {
    title: 'Explore the schema canvas',
    icon: Table2,
    body: 'Data Views are system tables that expose subscribers, sends, tracking, journeys, and more. Browse cards by segment, inspect field types, retention badges, and ⚠ known limitations without leaving the workspace.',
  },
  {
    title: 'Search across every table',
    icon: Search,
    body: 'Type a field name (for example JobID or SubscriberKey) in the command toolbar — or prefix with field: for field-only search. Matching tables stay in focus; unrelated cards fade so you can spot where a column lives instantly.',
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
    body: 'Check tables to open the SQL Sandbox. Pathfinder builds BFS join paths with correct four-key engagement joins. Utilities add date lookback, test-send exclusion, and unique-event filters — enabled by default for tracking views.',
  },
  {
    title: 'Starter templates & guides',
    icon: Zap,
    body: 'Open Starter Templates for 28 practitioner patterns (filter by category or search). For long-form join walkthroughs, visit /guides/ — 16 articles covering _Sent→_Open, Ent._Subscribers, complaints, SMS, and more.',
  },
  {
    title: 'Save and restore queries',
    icon: Save,
    body: 'Sign in to save named queries (up to 10) with SQL, table selection, segment, and sandbox settings. Use the Saved tab to restore; History keeps local snapshots in your browser.',
  },
  {
    title: 'Select tables for SQL',
    icon: CheckSquare,
    body: 'When selections do not share direct keys, Pathfinder injects bridge tables automatically in the JOIN section — your checkboxes stay limited to what you chose.',
  },
] as const;

const PRO_TIPS = [
  {
    icon: LayoutGrid,
    title: 'Compact canvas layout',
    body: 'Use the Comfortable / Compact toggle in the command toolbar to fit more data view cards on screen without changing your browser zoom.',
  },
  {
    icon: Lightbulb,
    title: 'Query performance',
    body: 'Large joins against _Open or _Click can time out in Query Studio. The sandbox enables “Limit past 30 days” automatically when tracking views are selected — keep EventDate filters early.',
  },
  {
    icon: AlertTriangle,
    title: 'Known limitations',
    body: 'Click ⚠ on any card header for practitioner warnings — e.g. _Sent.EmailName is null (join _Job), Apple MPP inflates _Open, or Ent._Subscribers for child BU scope.',
  },
  {
    icon: Lock,
    title: 'Enterprise BU mode',
    body: 'Toggle Enterprise BU in the command toolbar (core segment) to prefix system data views with Ent. — required for parent-account queries that span child business units.',
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
  onCloseCopilot?: () => void;
};

export function Header({
  onToggleCopilot,
  isCopilotOpen = false,
  onSignInRequired,
  onOpenSqlTemplates,
  onCloseCopilot,
}: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthLoading, dailyUsageCount, dailyLimit } = useAuth();
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isPlatformInfoOpen, setIsPlatformInfoOpen] = useState(false);
  const docsPanelRef = useRef<HTMLDivElement>(null);
  const docsTitleId = useId();

  useFocusTrap(docsPanelRef, isDocsOpen);

  const openDocs = () => {
    onCloseCopilot?.();
    setIsDocsOpen(true);
  };

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
    const handleOpenDocumentation = () => openDocs();
    const handleOpenPlatformInfo = () => setIsPlatformInfoOpen(true);

    window.addEventListener(OPEN_DOCUMENTATION_EVENT, handleOpenDocumentation);
    window.addEventListener(OPEN_PLATFORM_INFO_EVENT, handleOpenPlatformInfo);

    return () => {
      window.removeEventListener(OPEN_DOCUMENTATION_EVENT, handleOpenDocumentation);
      window.removeEventListener(OPEN_PLATFORM_INFO_EVENT, handleOpenPlatformInfo);
    };
  }, []);

  const copilotUsageLabel =
    user && dailyUsageCount !== null
      ? `${dailyUsageCount}/${dailyLimit ?? DAILY_COPILOT_QUERY_LIMIT}`
      : null;
  const copilotAtLimit =
    dailyUsageCount !== null && dailyUsageCount >= (dailyLimit ?? DAILY_COPILOT_QUERY_LIMIT);
  const copilotLowUsage =
    dailyUsageCount !== null &&
    dailyUsageCount === (dailyLimit ?? DAILY_COPILOT_QUERY_LIMIT) - 1;

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
                  {BRAND_NAME}
                </h1>
                <p className="hidden truncate text-xs text-slate-500 sm:inline-block dark:text-slate-400">
                  {BRAND_TAGLINE}
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
                title={
                  user
                    ? copilotUsageLabel
                      ? `AI Copilot — ${copilotUsageLabel} queries used today`
                      : 'AI Copilot — uses your canvas and sandbox context'
                    : 'AI Copilot — sign in required'
                }
                className={`btn-nav btn-nav-violet relative ${
                  isCopilotOpen ? 'btn-nav-violet-active' : ''
                }`}
              >
                {!user && !isAuthLoading ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
                ) : null}
                <Sparkles
                  className={`h-4 w-4 ${isCopilotOpen ? 'text-violet-600 dark:text-violet-400' : 'text-violet-500 dark:text-violet-400'}`}
                  aria-hidden
                />
                <span className="hidden sm:inline">AI Copilot</span>
                <span className="sm:hidden">AI</span>
                {copilotUsageLabel ? (
                  <span
                    className={`ml-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none ${
                      copilotAtLimit
                        ? 'bg-red-500 text-white'
                        : copilotLowUsage
                          ? 'bg-amber-500 text-white'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200'
                    }`}
                  >
                    {copilotUsageLabel}
                  </span>
                ) : null}
              </button>

              {isAuthLoading ? (
                <div
                  className="h-10 w-24 animate-pulse rounded-xl border border-slate-200/60 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  aria-hidden
                />
              ) : !user ? (
                <button
                  type="button"
                  onClick={onSignInRequired}
                  className="btn-nav border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  Sign In
                </button>
              ) : (
                <AccountProfileDropdown onSignedOut={onSignInRequired} />
              )}

              <button
                type="button"
                onClick={openDocs}
                className="btn-nav btn-nav-cyan"
                aria-haspopup="dialog"
                aria-expanded={isDocsOpen}
                title="Documentation & user guide"
              >
                <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
                <span>Docs</span>
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
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={docsTitleId}
            className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="border-b border-slate-200 bg-gradient-to-r from-cyan-50/80 to-white px-6 py-5 dark:border-slate-800 dark:from-cyan-950/40 dark:to-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                    {BRAND_NAME}
                  </p>
                  <h2 id={docsTitleId} className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    Documentation &amp; User Guide
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Step-by-step guides for the schema canvas, SQL Sandbox, saved queries, templates,
                    and shareable workspace links.
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
                  SQL Sandbox tabs
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">Live Query</strong>{' '}
                    — card-driven SQL with Pathfinder joins and utility toggles.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">Starter Templates</strong>{' '}
                    — 28 patterns; filter by Deliverability, Journey, SMS, and more.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">History</strong>{' '}
                    — recent SQL snapshots stored locally in your browser.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">Saved</strong>{' '}
                    — cloud saved queries (sign-in, up to 10). Use <strong className="font-medium">Save query</strong> in
                    the toolbar.
                  </li>
                </ul>
              </section>

              <section className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Layout &amp; canvas
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <li>
                    Use the <strong className="font-medium text-slate-800 dark:text-slate-200">Comfortable / Compact</strong>{' '}
                    toggle in the command toolbar to fit more cards on screen.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">Copy link</strong>{' '}
                    shares your current table selections and sandbox settings with colleagues via the URL.
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

              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <a
                    href="/guides/"
                    className="font-medium text-cyan-600 underline-offset-2 hover:underline dark:text-cyan-400"
                  >
                    Practitioner SQL guides
                  </a>
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <a
                    href="/views/"
                    className="font-medium text-cyan-600 underline-offset-2 hover:underline dark:text-cyan-400"
                  >
                    Static data view reference
                  </a>
                </span>
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Field descriptions align with official SFMC Data View documentation.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
