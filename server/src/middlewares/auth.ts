import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  email: string;
  globalRole: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  if (!env.JWT_ACCESS_SECRET) {
    return next(
      new AppError(500, 'JWT secrets are required for authentication'),
    );
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.globalRole !== 'string'
    ) {
      return next(new AppError(401, 'Invalid token'));
    }
    req.auth = {
      userId: decoded.sub,
      email: decoded.email,
      globalRole: decoded.globalRole,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
