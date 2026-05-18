import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth';
import { requireCompanyAccess } from '../../middlewares/companyAccess';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import * as connector from './restaurant.connector';
import * as repo from './restaurant.repository';

const router = Router({ mergeParams: true });

const MODULE_KEY = 'restaurant_schedule';

function isIntegrationConfigured(companyId: string): boolean {
  const configured = env.PASTA_HOUSE_COMPANY_ID;
  return !!configured && configured === companyId;
}

// GET /api/companies/:companyId/restaurant-schedule
router.get(
  '/',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      const params = z
        .object({ companyId: z.string().uuid() })
        .safeParse(req.params);
      if (!params.success) throw new AppError(400, 'Invalid company ID');

      const { companyId } = params.data;

      const hasModule = await repo.hasActiveModule(companyId, MODULE_KEY);
      if (!hasModule) throw new AppError(403, 'MODULE_NOT_ENABLED');

      if (!isIntegrationConfigured(companyId)) {
        throw new AppError(503, 'INTEGRATION_NOT_CONFIGURED');
      }

      const schedule = await connector.fetchRestaurantSchedule();
      res.json(schedule);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
