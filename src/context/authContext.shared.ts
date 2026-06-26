/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DAILY_COPILOT_QUERY_LIMIT } from '../constants/copilotQuota';
import { isSupabaseConfigured } from '../utils/supabaseEnv';

export type AuthContextValue = {
  user: SupabaseUser | null;
  isAuthLoading: boolean;
  isAuthAvailable: boolean;
  dailyUsageCount: number | null;
  dailyLimit: number;
  refreshUsage: () => Promise<void>;
  applyKnownUsageCount: (count: number) => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function createAuthStubValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    isAuthLoading: false,
    isAuthAvailable: isSupabaseConfigured(),
    dailyUsageCount: null,
    dailyLimit: DAILY_COPILOT_QUERY_LIMIT,
    refreshUsage: async () => {},
    applyKnownUsageCount: () => {},
    signOut: async () => {},
    ...overrides,
  };
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
