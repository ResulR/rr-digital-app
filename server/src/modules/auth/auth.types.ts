export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  global_role: string;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  globalRole: string;
}

export interface CompanyAccess {
  id: string;
  name: string;
  status: string;
  role: string;
  modules: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
