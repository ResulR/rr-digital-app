import { apiRequest } from '../lib/apiClient';
import type { LoginResponse } from './authTypes';

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

// Best-effort server-side revocation. The caller should not block UI
// on this - local session is cleared independently.
export async function apiLogout(refreshToken: string): Promise<void> {
  await apiRequest('/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}
