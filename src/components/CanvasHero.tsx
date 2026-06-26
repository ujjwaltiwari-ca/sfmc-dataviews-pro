import { Sparkles } from 'lucide-react';

type CanvasHeroProps = {
  onStartWithSent?: () => void;
  onFocusSearch?: () => void;
};

export function CanvasHero({ onStartWithSent, onFocusSearch }: CanvasHeroProps) {
  return (
    <section
      className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 dark:border-slate-800/60 dark:bg-slate-950/50"
      aria-label="Workspace introduction"
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[15px]">
          Interactive SFMC Data View reference and SQL workspace
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:max-w-xl">
          Select tables below, trace join paths, and copy Query Studio–ready SQL from the sandbox.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStartWithSent}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-cyan-700 hover:to-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 sm:text-sm"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Start with _Sent
        </button>
        <button
          type="button"
          onClick={onFocusSearch}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:text-sm"
        >
          Search fields
        </button>
      </div>
    </section>
  );
}
