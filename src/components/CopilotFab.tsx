import { Sparkles } from 'lucide-react';
import { DAILY_COPILOT_QUERY_LIMIT } from '../constants/copilotQuota';

type CopilotFabProps = {
  onOpen: () => void;
  isCopilotOpen: boolean;
  usageCount: number | null;
  dailyLimit?: number;
  isSignedIn: boolean;
  showPulse?: boolean;
  bottomOffsetPx?: number;
};

export function CopilotFab({
  onOpen,
  isCopilotOpen,
  usageCount,
  dailyLimit = DAILY_COPILOT_QUERY_LIMIT,
  isSignedIn,
  showPulse = false,
  bottomOffsetPx = 0,
}: CopilotFabProps) {
  if (isCopilotOpen) {
    return null;
  }

  const showUsage = isSignedIn && usageCount !== null;
  const isAtLimit = showUsage && usageCount >= dailyLimit;
  const isLowUsage = showUsage && usageCount === dailyLimit - 1;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        showUsage
          ? `Open AI Copilot — ${usageCount} of ${dailyLimit} queries used today`
          : 'Open AI Copilot'
      }
      className="group fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_8px_30px_rgba(91,33,182,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_36px_rgba(91,33,182,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 sm:right-8"
      style={{ bottom: `${24 + bottomOffsetPx}px` }}
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-full bg-violet-400/30 ${
          showPulse ? 'opacity-70 motion-safe:animate-ping' : 'opacity-0'
        }`}
        aria-hidden
      />
      <Sparkles className="relative h-6 w-6" aria-hidden />
      {showUsage ? (
        <span
          className={`absolute -right-1 -top-1 min-w-[2rem] rounded-full border px-1.5 py-0.5 text-center font-mono text-[10px] font-bold leading-none ${
            isAtLimit
              ? 'border-red-300 bg-red-500 text-white'
              : isLowUsage
                ? 'border-amber-300 bg-amber-500 text-white'
                : 'border-violet-300 bg-white text-violet-700 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-200'
          }`}
        >
          {usageCount}/{dailyLimit}
        </span>
      ) : null}
    </button>
  );
}
