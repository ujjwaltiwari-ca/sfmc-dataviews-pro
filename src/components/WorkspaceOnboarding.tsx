import { GitBranch, Mail, UserSearch, X } from 'lucide-react';
import {
  ONBOARDING_INTENTS,
  type OnboardingIntent,
  type OnboardingIntentId,
} from '../constants/onboardingIntents';

const INTENT_ICONS: Record<OnboardingIntentId, typeof UserSearch> = {
  'find-subscriber': UserSearch,
  'measure-send': Mail,
  'audit-journey': GitBranch,
};

type WorkspaceOnboardingProps = {
  onSelectIntent: (intent: OnboardingIntent) => void;
  onDismiss: () => void;
};

export function WorkspaceOnboarding({ onSelectIntent, onDismiss }: WorkspaceOnboardingProps) {
  return (
    <section
      className="mb-5 rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-violet-50/50 px-4 py-5 shadow-sm dark:border-sky-900/40 dark:from-slate-900/80 dark:via-slate-950/60 dark:to-violet-950/30 sm:px-5"
      aria-label="Get started"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            What are you trying to find out?
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Pick a starting point — we&apos;ll open the right tables and a starter template in the
            SQL workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg border border-slate-200/80 bg-white/80 p-1.5 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label="Dismiss get started guide"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ONBOARDING_INTENTS.map((intent) => {
          const Icon = INTENT_ICONS[intent.id];
          return (
            <button
              key={intent.id}
              type="button"
              onClick={() => onSelectIntent(intent)}
              className="group flex flex-col rounded-lg border border-slate-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-sky-500/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950/60 dark:text-sky-300 dark:group-hover:bg-sky-600 dark:group-hover:text-white">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {intent.title}
              </span>
              <span className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {intent.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
