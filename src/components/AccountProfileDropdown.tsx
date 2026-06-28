import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { getRemainingCopilotQueries } from '../constants/copilotQuota';
import { useAuth } from '../context/authContext.shared';

type AccountProfileDropdownProps = {
  onSignedOut?: () => void;
};

type MenuPosition = {
  top: number;
  right: number;
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
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const email = user?.email ?? '';

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsUsageLoading(true);
    void refreshUsage().finally(() => {
      setIsUsageLoading(false);
    });
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
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

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
  const remainingQueries = getRemainingCopilotQueries(dailyUsageCount, dailyLimit);
  const isAtDailyLimit = remainingQueries === 0;
  const isLowQueries = remainingQueries === 1;
  const usagePercent =
    dailyUsageCount === null ? 0 : Math.min(100, (usageCount / dailyLimit) * 100);
  const remainingPercent =
    dailyUsageCount === null ? 0 : Math.min(100, ((remainingQueries ?? 0) / dailyLimit) * 100);

  const usageHeadline = isUsageLoading
    ? 'Checking usage…'
    : remainingQueries === null
      ? 'Usage unavailable'
      : `${remainingQueries} of ${dailyLimit} Copilot queries left today`;

  const usageSubtext =
    !isUsageLoading && dailyUsageCount !== null
      ? `${usageCount} used · resets at midnight UTC`
      : !isUsageLoading && remainingQueries === null
        ? 'Sign in again or refresh if this persists'
        : null;

  const menuPanel =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
            className="fixed z-[100] w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
          >
            <p
              className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
              title={email}
            >
              {email}
            </p>

            <div className="my-3 border-t border-slate-200/80 dark:border-slate-800" />

            <div
              className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-800/80"
              aria-label={
                remainingQueries === null
                  ? 'Copilot query usage unavailable'
                  : `${remainingQueries} of ${dailyLimit} Copilot queries remaining today`
              }
            >
              <p
                className={`text-sm font-semibold leading-snug ${
                  isAtDailyLimit
                    ? 'text-rose-600 dark:text-rose-400'
                    : isLowQueries
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {usageHeadline}
              </p>
              {usageSubtext ? (
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{usageSubtext}</p>
              ) : null}
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                role="progressbar"
                aria-valuenow={remainingQueries ?? 0}
                aria-valuemin={0}
                aria-valuemax={dailyLimit}
                aria-label="Copilot queries remaining today"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isAtDailyLimit
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                      : isLowQueries
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                  }`}
                  style={{
                    width: `${remainingQueries === null ? usagePercent : remainingPercent}%`,
                  }}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/80 py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
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
      </div>
      {menuPanel}
    </>
  );
}
