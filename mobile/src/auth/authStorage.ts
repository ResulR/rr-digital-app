import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from './authTypes';

const SESSION_KEY = 'rr_auth_session';

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

function isValidSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === 'string' &&
    typeof v.refreshToken === 'string' &&
    typeof v.user === 'object' &&
    v.user !== null &&
    typeof (v.user as Record<string, unknown>).id === 'string' &&
    typeof (v.user as Record<string, unknown>).email === 'string' &&
    typeof (v.user as Record<string, unknown>).fullName === 'string' &&
    typeof (v.user as Record<string, unknown>).globalRole === 'string'
  );
}
