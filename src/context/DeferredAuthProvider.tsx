import { lazy, Suspense, type ReactNode } from 'react';
import { AuthStubProvider } from './AuthStubProvider';

const LazyAuthProvider = lazy(() =>
  import('./AuthContext').then((module) => ({ default: module.AuthProvider })),
);

type DeferredAuthProviderProps = {
  active: boolean;
  children: ReactNode;
};

export function DeferredAuthProvider({ active, children }: DeferredAuthProviderProps) {
  if (!active) {
    return <AuthStubProvider>{children}</AuthStubProvider>;
  }

  return (
    <Suspense fallback={<AuthStubProvider isAuthLoading>{children}</AuthStubProvider>}>
      <LazyAuthProvider>{children}</LazyAuthProvider>
    </Suspense>
  );
}
