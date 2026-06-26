import { useMemo, type ReactNode } from 'react';
import { AuthContext, createAuthStubValue } from './authContext.shared';

type AuthStubProviderProps = {
  children: ReactNode;
  isAuthLoading?: boolean;
};

export function AuthStubProvider({ children, isAuthLoading = false }: AuthStubProviderProps) {
  const value = useMemo(
    () => createAuthStubValue({ isAuthLoading }),
    [isAuthLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
