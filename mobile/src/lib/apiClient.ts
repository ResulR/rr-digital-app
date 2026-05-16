// Minimal API client.
// - Uses API_BASE_URL from src/config/env.
// - Accepts paths starting with "/" (e.g. "/health", "/auth/login").
// - Parses JSON responses, falls back to raw text.
// - Throws ApiError with status + parsed body on non-2xx responses.
// - Does NOT handle access tokens, refresh tokens, or auth headers yet.

import { API_BASE_URL } from '../config/env';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base + normalizedPath;
}

function extractErrorMessage(status: number, body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'string'
  ) {
    return (body as { error: string }).error;
  }
  return `Request failed with status ${status}`;
}

export async function apiRequest<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = buildUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers ?? {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(0, `Network error: ${message}`, null);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(response.status, body),
      body,
    );
  }

  return body as T;
}
