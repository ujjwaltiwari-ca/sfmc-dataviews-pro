import {
  ArrowRight,
  CheckSquare,
  GitBranch,
  Layers,
  Sparkles,
  Table2,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { sfmcDataViews } from '../data/sfmcSchema';

type CanvasHeroProps = {
  onStartWithSent?: () => void;
  onFocusSearch?: () => void;
};

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

function ProofPoint({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 sm:text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
      {label}
    </span>
  );
}

export function CanvasHero({ onStartWithSent, onFocusSearch }: CanvasHeroProps) {
  const tableCount = sfmcDataViews.length;

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-xl border border-slate-200/60 bg-white/70 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/70 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
      aria-label="Welcome to DataViews.pro"
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-cyan-500" aria-hidden />

      <div className="flex flex-col gap-4 px-4 py-4 pl-5 sm:gap-5 sm:px-5 sm:py-5 sm:pl-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              The SFMC Data View reference practitioners actually use.
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
              Browse schemas, trace join paths on the canvas, and generate Query Studio–ready SQL
              with auto-joins — then paste into Automation Studio or Query Studio.
            </p>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Product highlights">
              <ProofPoint icon={Layers} label={`${tableCount}+ Data Views`} />
              <ProofPoint icon={GitBranch} label="BFS auto-join paths" />
              <ProofPoint icon={Terminal} label="Query Studio ready" />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:pt-0.5">
            <button
              type="button"
              onClick={onStartWithSent}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(6,182,212,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:from-cyan-700 hover:to-blue-700 hover:shadow-[0_8px_20px_rgba(6,182,212,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Start with _Sent
            </button>
            <button
              type="button"
              onClick={onFocusSearch}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              Search fields
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-slate-200/60 pt-3 text-[11px] font-medium text-slate-500 dark:border-slate-800/60 dark:text-slate-400 sm:gap-x-2.5 sm:text-xs"
          aria-label="Getting started steps"
        >
          <FlowStep icon={Table2} label="Browse Data Views" />
          <FlowSeparator />
          <FlowStep icon={CheckSquare} label="Select cards" />
          <FlowSeparator />
          <FlowStep icon={Terminal} label="Copy SQL from Sandbox" />
        </div>
      </div>
    </section>
  );
}
