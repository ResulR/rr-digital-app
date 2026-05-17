import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth';
import { requireCompanyAccess } from '../../middlewares/companyAccess';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import * as connector from './restaurant.connector';
import * as repo from './restaurant.repository';

const router = Router({ mergeParams: true });

const MODULE_KEY = 'restaurant_orders';

const VALID_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'preparing',
  'ready',
  'in_delivery',
  'completed',
  'cancelled',
  'payment_failed',
] as const;

const listQuerySchema = z.object({
  date: z.enum(['today']).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// In V1 the company<->integration mapping is env-based.
// PASTA_HOUSE_COMPANY_ID is the UUID of Pasta House in the RR Digital DB.
function isIntegrationConfigured(companyId: string): boolean {
  const configured = env.PASTA_HOUSE_COMPANY_ID;
  return !!configured && configured === companyId;
}

// GET /api/companies/:companyId/restaurant-orders
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

      const query = listQuerySchema.safeParse(req.query);
      if (!query.success) throw new AppError(400, 'Invalid query parameters');

      const orders = await connector.fetchOrders({
        date: query.data.date,
        status: query.data.status,
        limit: query.data.limit,
      });

      res.json({ orders });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/companies/:companyId/restaurant-orders/:orderId
router.get(
  '/:orderId',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      const params = z
        .object({ companyId: z.string().uuid() })
        .safeParse(req.params);
      if (!params.success) throw new AppError(400, 'Invalid company ID');

      const { companyId } = params.data;

      const orderId = String(req.params.orderId ?? '').trim();
      if (!orderId || !/^\d+$/.test(orderId)) {
        throw new AppError(400, 'Invalid order ID');
      }

      const hasModule = await repo.hasActiveModule(companyId, MODULE_KEY);
      if (!hasModule) throw new AppError(403, 'MODULE_NOT_ENABLED');

      if (!isIntegrationConfigured(companyId)) {
        throw new AppError(503, 'INTEGRATION_NOT_CONFIGURED');
      }

      const order = await connector.fetchOrderById(orderId);
      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
