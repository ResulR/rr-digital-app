import cors from 'cors';
import type { CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { authRateLimiter } from './middlewares/rateLimit';
import authRoutes from './modules/auth/auth.routes';
import companiesRoutes from './modules/companies/companies.routes';
import restaurantOrdersRoutes from './modules/restaurant/restaurant.routes';
import restaurantScheduleRoutes from './modules/restaurant/restaurant-schedule.routes';
import healthRoutes from './routes/health.routes';

function buildCorsOptions(): CorsOptions | undefined {
  // Wildcard => let cors() use its default (Access-Control-Allow-Origin: *).
  // CSV list => only those exact origins are allowed.
  // Requests without an Origin header (mobile native, curl, server-to-server)
  // are NOT blocked by the cors middleware regardless of the option.
  if (env.CORS_ORIGIN === '*') return undefined;
  const origins = env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { origin: origins };
}

export function createApp() {
  const app = express();

  // Required when running behind a reverse proxy (Nginx) so that req.ip
  // reflects the real client IP rather than the proxy's loopback address.
  // Critical for rate limiting per client IP. 0 = direct connection.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRoutes);

  // Rate-limit only the sensitive auth endpoints; do not throttle
  // /api/auth/me or future polling endpoints.
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/refresh', authRateLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companiesRoutes);
  app.use('/api/companies/:companyId/restaurant-orders', restaurantOrdersRoutes);
  app.use('/api/companies/:companyId/restaurant-schedule', restaurantScheduleRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  app.use(errorHandler);

  return app;
}
