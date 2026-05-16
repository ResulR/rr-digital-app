// Mirrors the backend's PublicUser + LoginResult shapes.
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

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
