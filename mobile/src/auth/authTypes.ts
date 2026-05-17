// Mirrors the backend's types.
// Backend source of truth: server/src/modules/auth/auth.types.ts

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  globalRole: string;
}

export interface LoginResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// POST /auth/refresh response — does NOT include user (tokens only).
// The user object is preserved from the stored session.
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface CompanyAccess {
  id: string;
  name: string;
  status: string;
  role: string;
  modules: string[];
}

// GET /auth/me response
export interface MeResponse {
  user: PublicUser;
  companies: CompanyAccess[];
}
