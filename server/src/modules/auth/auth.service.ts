import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import * as repo from './auth.repository';
import type {
  AuthTokens,
  CompanyAccess,
  LoginResult,
  PublicUser,
  UserRow,
} from './auth.types';

function requireSecrets(): { access: string; refresh: string } {
  if (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) {
    throw new AppError(500, 'JWT secrets are required for authentication');
  }
  return {
    access: env.JWT_ACCESS_SECRET,
    refresh: env.JWT_REFRESH_SECRET,
  };
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    globalRole: user.global_role,
  };
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: UserRow): string {
  const { access } = requireSecrets();
  const options: SignOptions = {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { email: user.email, globalRole: user.global_role },
    access,
    options,
  );
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await repo.createRefreshToken({ userId, tokenHash, expiresAt });
  return raw;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  requireSecrets();
  const user = await repo.findUserByEmail(input.email);
  if (!user || user.status !== 'active') {
    throw new AppError(401, 'Invalid email or password');
  }
  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) {
    throw new AppError(401, 'Invalid email or password');
  }

  await repo.updateLastLogin(user.id);
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
  };
}

export async function refresh(input: {
  refreshToken: string;
}): Promise<AuthTokens> {
  requireSecrets();
  const tokenHash = hashRefreshToken(input.refreshToken);
  const found = await repo.findValidRefreshTokenWithUser(tokenHash);
  if (!found || found.user.status !== 'active') {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  await repo.revokeRefreshTokenById(found.tokenId);
  const accessToken = signAccessToken(found.user);
  const newRefreshToken = await issueRefreshToken(found.user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
  };
}

export async function logout(input: {
  refreshToken?: string;
}): Promise<void> {
  if (!input.refreshToken) return;
  const tokenHash = hashRefreshToken(input.refreshToken);
  await repo.revokeRefreshTokenByHash(tokenHash);
}

export async function getMe(userId: string): Promise<{
  user: PublicUser;
  companies: CompanyAccess[];
}> {
  const user = await repo.findUserById(userId);
  if (!user || user.status !== 'active') {
    throw new AppError(401, 'Authentication required');
  }
  const companies = await repo.listUserCompanies(user.id);
  return { user: toPublicUser(user), companies };
}
