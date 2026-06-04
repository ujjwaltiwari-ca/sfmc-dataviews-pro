import { ArrowRight, CheckSquare, Table2, Terminal, type LucideIcon } from 'lucide-react';

function FlowStep({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function FlowSeparator() {
  return (
    <ArrowRight
      className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:inline dark:text-slate-600"
      aria-hidden
    />
  );
}

export function CanvasHero() {
  return (
    <section
      className="relative mb-6 overflow-hidden rounded-xl border border-slate-200/60 bg-white/70 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
      aria-label="Welcome to DataViews.pro"
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-cyan-500" aria-hidden />

      <div className="flex flex-col gap-4 px-4 py-4 pl-5 sm:gap-5 sm:px-5 sm:py-5 sm:pl-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            Explore SFMC Data Views. Build SQL in minutes.
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
            Trace relationships on the schema canvas, build SQL quickly, then paste into Query
            Studio or Automation Studio to test and analyze.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-slate-200/60 pt-3 text-[11px] font-medium text-slate-500 dark:border-slate-800/60 dark:text-slate-400 sm:gap-x-2.5 sm:border-t-0 sm:pt-0 sm:text-xs md:shrink-0 md:justify-end"
          aria-label="Getting started steps"
        >
          <FlowStep icon={Table2} label="Browse Data Views" />
          <FlowSeparator />
          <FlowStep icon={CheckSquare} label="Select Canvas Cards" />
          <FlowSeparator />
          <FlowStep icon={Terminal} label="Open Workspace Sandbox" />
        </div>
      </div>
    </section>
  );
}
