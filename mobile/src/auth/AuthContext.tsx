// In-memory only auth session. No persistence (SecureStore/AsyncStorage).
// Reloading the app means the user must log in again - by design for this step.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiLogin, apiLogout } from './authApi';
import type { AuthSession, PublicUser } from './authTypes';

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await apiLogin({ email, password });
      setSession({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    const currentRefreshToken = session?.refreshToken;
    // Always clear local state first so the UI updates immediately.
    setSession(null);
    if (currentRefreshToken) {
      // Best-effort server-side revoke; swallow errors so logout
      // always succeeds locally even if the network is down.
      try {
        await apiLogout(currentRefreshToken);
      } catch {
        // intentionally ignored
      }
    }
  }, [session?.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      isAuthenticated: session !== null,
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
