import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isProd = env.NODE_ENV === 'production';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Internal Server Error';

  const body: Record<string, unknown> = {
    error: 'Internal Server Error',
    message: isProd ? 'Internal Server Error' : message,
  };

  if (!isProd && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(500).json(body);
}
