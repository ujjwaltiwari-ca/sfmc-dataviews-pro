import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AccountProfileDropdownProps = {
  onSignedOut?: () => void;
};

function getProfileInitial(email: string | undefined): string {
  if (!email) {
    return '?';
  }
  const localPart = email.split('@')[0]?.trim();
  return (localPart?.[0] ?? email[0] ?? '?').toUpperCase();
}

export function AccountProfileDropdown({ onSignedOut }: AccountProfileDropdownProps) {
  const { user, dailyUsageCount, dailyLimit, refreshUsage, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const email = user?.email ?? '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshUsage();
  }, [isOpen, refreshUsage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Defer so the same pointer/click that opened the menu does not immediately close it.
    const attachTimer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDownOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(attachTimer);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen((open) => !open);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      onSignedOut?.();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const usageCount = dailyUsageCount ?? 0;
  const isAtDailyLimit = dailyUsageCount !== null && usageCount >= dailyLimit;
  const usageDisplay = dailyUsageCount === null ? '—' : String(usageCount);
  const usagePercent =
    dailyUsageCount === null ? 0 : Math.min(100, (usageCount / dailyLimit) * 100);

  return (
    <div ref={containerRef} className="relative z-50">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="relative z-50 inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/80 py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-semibold text-white shadow-sm"
          aria-hidden
        >
          {getProfileInitial(email)}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className="sr-only">Account menu for {email}</span>
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <p
            className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
            title={email}
          >
            {email}
          </p>

          <div className="my-3 border-t border-slate-200/80 dark:border-slate-800" />

          <div
            className="rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40"
            aria-label={`AI Query Usage: ${usageDisplay} of ${dailyLimit}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                AI Query Usage
              </span>
              <span
                className={`text-xs tabular-nums ${
                  isAtDailyLimit
                    ? 'font-semibold text-rose-500 dark:text-rose-400'
                    : 'font-medium text-slate-600 dark:text-slate-300'
                }`}
              >
                {usageDisplay} / {dailyLimit}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60"
              role="progressbar"
              aria-valuenow={dailyUsageCount ?? 0}
              aria-valuemin={0}
              aria-valuemax={dailyLimit}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isAtDailyLimit
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={(event) => {
              event.stopPropagation();
              void handleSignOut();
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {isSigningOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
