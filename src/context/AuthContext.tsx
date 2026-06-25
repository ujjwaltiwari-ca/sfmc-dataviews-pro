/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DAILY_COPILOT_QUERY_LIMIT } from '../constants/copilotQuota';
import { fetchTodayCopilotUsageCount, purgeSupabaseAuthStorage } from '../utils/copilotUsage';
import { getSupabase, isSupabaseConfigured } from '../utils/supabaseClient';

type AuthContextValue = {
  user: SupabaseUser | null;
  isAuthLoading: boolean;
  isAuthAvailable: boolean;
  dailyUsageCount: number | null;
  dailyLimit: number;
  refreshUsage: () => Promise<void>;
  applyKnownUsageCount: (count: number) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthAvailable = isSupabaseConfigured();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isAuthAvailable);
  const [dailyUsageCount, setDailyUsageCount] = useState<number | null>(null);

  const refreshUsage = useCallback(async () => {
    if (!isAuthAvailable || !user?.id) {
      setDailyUsageCount(null);
      return;
    }

    const supabase = getSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[AuthContext] Failed to read session before usage refresh:', {
        message: sessionError.message,
        status: sessionError.status,
      });
    }

    const accessToken = sessionData.session?.access_token ?? null;

    try {
      const count = await fetchTodayCopilotUsageCount(user.id, accessToken);
      setDailyUsageCount(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AuthContext] Failed to fetch daily copilot usage:', {
        userId: user.id,
        message,
        hint:
          'Ensure SUPABASE_SERVICE_ROLE_KEY is set for /api/usage, or add a SELECT RLS policy on user_usage for auth.uid() = user_id.',
      });
      setDailyUsageCount(null);
    }
  }, [isAuthAvailable, user]);

  const applyKnownUsageCount = useCallback((count: number) => {
    setDailyUsageCount((previous) => {
      if (previous === null) {
        return count;
      }
      return Math.max(previous, count);
    });
  }, []);

  useEffect(() => {
    if (!isAuthAvailable) {
      return;
    }

    const supabase = getSupabase();
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setUser(data.session?.user ?? null);
        setIsAuthLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isAuthAvailable]);

  useEffect(() => {
    if (user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refreshUsage();
    }
  }, [user?.id, refreshUsage]);

  const signOut = useCallback(async () => {
    if (!isAuthAvailable) {
      return;
    }

    await getSupabase().auth.signOut();
    purgeSupabaseAuthStorage();
    setUser(null);
    setDailyUsageCount(null);
  }, [isAuthAvailable]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthLoading,
      isAuthAvailable,
      dailyUsageCount,
      dailyLimit: DAILY_COPILOT_QUERY_LIMIT,
      refreshUsage,
      applyKnownUsageCount,
      signOut,
    }),
    [
      user,
      isAuthLoading,
      isAuthAvailable,
      dailyUsageCount,
      refreshUsage,
      applyKnownUsageCount,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
