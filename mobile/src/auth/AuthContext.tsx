import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiLogin, apiLogout } from './authApi';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './authStorage';
import type { AuthSession, PublicUser } from './authTypes';

interface AuthContextValue {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // On mount: try to restore a previously saved session from SecureStore.
  useEffect(() => {
    loadAuthSession()
      .then((saved) => {
        if (saved) {
          setSession(saved);
        }
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await apiLogin({ email, password });
      const newSession: AuthSession = {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
      await saveAuthSession(newSession);
      setSession(newSession);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    const currentRefreshToken = session?.refreshToken;
    // Clear local state and SecureStore immediately so the UI updates.
    setSession(null);
    await clearAuthSession().catch(() => {});
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
      isRestoringSession,
      login,
      logout,
    }),
    [session, isRestoringSession, login, logout],
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

