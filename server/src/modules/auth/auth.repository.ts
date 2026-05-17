import { getPool } from '../../db/pool';
import type { CompanyAccess, UserRow } from './auth.types';

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await getPool().query<UserRow>(
    `SELECT id, email, password_hash, full_name, global_role, status,
            last_login_at, created_at, updated_at
       FROM users
      WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await getPool().query<UserRow>(
    `SELECT id, email, password_hash, full_name, global_role, status,
            last_login_at, created_at, updated_at
       FROM users
      WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await getPool().query(
    `UPDATE users
        SET last_login_at = now(), updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

export async function createRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [input.userId, input.tokenHash, input.expiresAt],
  );
}

export interface RefreshTokenWithUser {
  tokenId: string;
  user: UserRow;
}

export async function findValidRefreshTokenWithUser(
  tokenHash: string,
): Promise<RefreshTokenWithUser | null> {
  const result = await getPool().query<{
    token_id: string;
    user_id: string;
    email: string;
    password_hash: string;
    full_name: string;
    global_role: string;
    status: string;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT rt.id  AS token_id,
            u.id   AS user_id,
            u.email, u.password_hash, u.full_name, u.global_role, u.status,
            u.last_login_at, u.created_at, u.updated_at
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1
        AND rt.revoked_at IS NULL
        AND rt.expires_at > now()
      LIMIT 1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    tokenId: row.token_id,
    user: {
      id: row.user_id,
      email: row.email,
      password_hash: row.password_hash,
      full_name: row.full_name,
      global_role: row.global_role,
      status: row.status,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function revokeRefreshTokenByHash(
  tokenHash: string,
): Promise<void> {
  await getPool().query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE token_hash = $1
        AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function revokeRefreshTokenById(tokenId: string): Promise<void> {
  await getPool().query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE id = $1
        AND revoked_at IS NULL`,
    [tokenId],
  );
}

export async function listUserCompanies(
  userId: string,
): Promise<CompanyAccess[]> {
  const result = await getPool().query<CompanyAccess>(
    `SELECT
       c.id,
       c.name,
       c.status,
       cu.role,
       COALESCE(
         array_agg(cm.module_key ORDER BY cm.module_key)
           FILTER (WHERE cm.module_key IS NOT NULL),
         ARRAY[]::text[]
       ) AS modules
     FROM company_users cu
     JOIN companies c ON c.id = cu.company_id
     LEFT JOIN company_modules cm
       ON cm.company_id = c.id
      AND cm.active = true
     WHERE cu.user_id = $1
       AND cu.status = 'active'
     GROUP BY c.id, c.name, c.status, cu.role
     ORDER BY c.name ASC`,
    [userId],
  );
  return result.rows;
}
