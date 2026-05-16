import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiRequest } from '../lib/apiClient';
import { apiLogin, apiLogout, apiRefresh } from './authApi';
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
  // Attempt a token refresh with the stored refresh token.
  // Returns true on success, false if the session must be re-established.
  refreshSession: () => Promise<boolean>;
  // Make an authenticated request with Authorization Bearer.
  // On 401: attempts one refresh, retries once, then clears session.
  // Never use for /auth/login, /auth/refresh, /auth/logout.
  authenticatedRequest: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // On mount: restore from SecureStore and immediately validate via refresh.
  // This guarantees the app never starts with a stale access token.
  useEffect(() => {
    loadAuthSession()
      .then(async (saved) => {
        if (!saved) return; // no stored session → stay logged out
        try {
          const tokens = await apiRefresh(saved.refreshToken);
          const newSession: AuthSession = {
            user: saved.user, // user is preserved (refresh response has no user)
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          };
          await saveAuthSession(newSession);
          setSession(newSession);
        } catch {
          // Refresh token expired or revoked → force re-login
          await clearAuthSession().catch(() => {});
          // session remains null
        }
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, []);

  // Internal: exchange the current refresh token for a new token pair.
  // Returns the new accessToken on success, null on failure.
  // On failure, clears session state and SecureStore.
  const doRefresh = useCallback(async (): Promise<string | null> => {
    const rt = session?.refreshToken;
    const user = session?.user;
    if (!rt || !user) return null;
    try {
      const tokens = await apiRefresh(rt);
      const newSession: AuthSession = {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      await saveAuthSession(newSession);
      setSession(newSession);
      return tokens.accessToken;
    } catch {
      // Refresh failed → session is no longer valid
      setSession(null);
      await clearAuthSession().catch(() => {});
      return null;
    }
  }, [session]);

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

  // Exposed: attempt a token refresh. Returns true on success.
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const newToken = await doRefresh();
    return newToken !== null;
  }, [doRefresh]);

  // Exposed: authenticated fetch wrapper with one-time 401 retry.
  // Adds Authorization: Bearer header. On 401, refreshes once and retries.
  // Never use for /auth/login, /auth/refresh, /auth/logout.
  const authenticatedRequest = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const currentToken = session?.accessToken;
      if (!currentToken) {
        throw new ApiError(401, 'Authentication required', null);
      }

      try {
        return await apiRequest<T>(path, {
          ...options,
          headers: {
            Authorization: `Bearer ${currentToken}`,
            ...(options?.headers ?? {}),
          },
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // One refresh attempt — doRefresh returns the new token directly
          // so we don't read stale state from the closure.
          const newToken = await doRefresh();
          if (!newToken) {
            // doRefresh already cleared the session — just propagate the error.
            throw err;
          }
          // One retry with the fresh token.
          return await apiRequest<T>(path, {
            ...options,
            headers: {
              Authorization: `Bearer ${newToken}`,
              ...(options?.headers ?? {}),
            },
          });
        }
        throw err;
      }
    },
    [session, doRefresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      isAuthenticated: session !== null,
      isRestoringSession,
      login,
      logout,
      refreshSession,
      authenticatedRequest,
    }),
    [session, isRestoringSession, login, logout, refreshSession, authenticatedRequest],
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
