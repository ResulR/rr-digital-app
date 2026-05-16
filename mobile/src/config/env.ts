// Centralized mobile environment configuration.
// Reads EXPO_PUBLIC_API_URL injected at build time by Expo's babel plugin.
// EXPO_PUBLIC_* variables are public - never put secrets here.

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. ' +
      'Define it in mobile/.env (see mobile/.env.example).',
  );
}

export const API_BASE_URL = apiBaseUrl;
