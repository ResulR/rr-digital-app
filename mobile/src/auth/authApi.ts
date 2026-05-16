import { apiRequest } from '../lib/apiClient';
import type { LoginResponse, RefreshResponse } from './authTypes';

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// Rotates the refresh token: the old one is revoked server-side,
// a new pair (accessToken + refreshToken) is returned.
// The user object is NOT in the response — preserve it from the stored session.
export async function apiRefresh(refreshToken: string): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}

// Best-effort server-side revocation. The caller should not block UI
// on this — local session is cleared independently.
export async function apiLogout(refreshToken: string): Promise<void> {
  await apiRequest('/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}
