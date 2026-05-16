import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pool';
import { AppError } from '../utils/errors';

// Extend Express Request to carry the resolved company-level role.
// 'superadmin' means global bypass; 'admin' and 'user' are company roles.
declare global {
  namespace Express {
    interface Request {
      companyRole?: 'superadmin' | 'admin' | 'user';
    }
  }
}

// Validate companyId format before it ever reaches a DB query.
// This prevents PostgreSQL from receiving a malformed UUID and returning
// a DB error instead of a clean 400 response.
const companyAccessParamsSchema = z.object({
  companyId: z.string().uuid('Company ID must be a valid UUID'),
});

/**
 * Must run after requireAuth (needs req.auth).
 * Validates companyId format, then verifies the authenticated user has an
 * active membership in the requested company.
 * Attaches req.companyRole for downstream handlers.
 *
 * SuperAdmin bypass: global superadmin can access any company without a
 * company_users row.
 */
export async function requireCompanyAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    next(new AppError(401, 'Authentication required'));
    return;
  }

  // Validate UUID format first — before any DB access.
  const params = companyAccessParamsSchema.safeParse(req.params);
  if (!params.success) {
    next(new AppError(400, 'Invalid company ID'));
    return;
  }

  const { companyId } = params.data;

  // Global superadmin bypasses company membership — can see all companies.
  if (req.auth.globalRole === 'superadmin') {
    req.companyRole = 'superadmin';
    next();
    return;
  }

  try {
    const result = await getPool().query<{ role: 'admin' | 'user' }>(
      `SELECT role
         FROM company_users
        WHERE company_id = $1
          AND user_id    = $2
          AND status     = 'active'
        LIMIT 1`,
      [companyId, req.auth.userId],
    );

    if (!result.rows[0]) {
      next(new AppError(403, 'Access denied to this company'));
      return;
    }

    req.companyRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
}
