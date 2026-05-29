import { Database, Layers, Mail } from 'lucide-react';
import { VIEW_SEGMENTS, type ViewSegmentId } from '../data/viewSegments';

const segmentIcons: Record<ViewSegmentId, typeof Database> = {
  core: Database,
  sendlog: Mail,
  synchronized: Layers,
};

type ViewSegmentNavProps = {
  activeSegment: ViewSegmentId;
  onSegmentChange: (segment: ViewSegmentId) => void;
};

export function ViewSegmentNav({ activeSegment, onSegmentChange }: ViewSegmentNavProps) {
  return (
    <nav
      className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90 lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6"
      aria-label="View segment navigation"
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Canvas
      </p>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">View segments</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Switch schemas instantly — the main grid updates to match your selection.
      </p>

      <div
        className="mt-4 flex flex-col gap-2"
        role="tablist"
        aria-orientation="vertical"
      >
        {VIEW_SEGMENTS.map((segment) => {
          const Icon = segmentIcons[segment.id];
          const isActive = activeSegment === segment.id;

          return (
            <button
              key={segment.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSegmentChange(segment.id)}
              className={`group relative w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                isActive
                  ? 'border-cyan-500/60 bg-cyan-50 shadow-md shadow-cyan-500/10 dark:border-cyan-500/40 dark:bg-cyan-950/40 dark:shadow-cyan-900/20'
                  : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-colors ${
                  isActive ? 'bg-cyan-500' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                }`}
                aria-hidden
              />
              <div className="flex items-start gap-3 pl-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-semibold leading-tight ${
                        isActive
                          ? 'text-cyan-950 dark:text-cyan-100'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {segment.label}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200'
                          : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {segment.tableCount}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {segment.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
