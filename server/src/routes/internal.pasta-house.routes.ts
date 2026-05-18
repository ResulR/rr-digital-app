import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import * as service from '../modules/notifications/notifications.service';

const router = Router();

const bodySchema = z.object({
  companyId: z.string().uuid(),
  orderId: z.string().min(1),
  orderNumber: z.string().optional().nullable(),
  totalCents: z.number().int().nonnegative().optional().nullable(),
  fulfillmentMethod: z.string().optional().nullable(),
});

router.post('/new-order', async (req, res, next) => {
  try {
    if (!env.PASTA_HOUSE_INCOMING_TOKEN) {
      throw new AppError(503, 'INTERNAL_INTEGRATION_NOT_CONFIGURED');
    }

    const incomingToken = req.header('x-internal-token');
    if (!incomingToken || incomingToken !== env.PASTA_HOUSE_INCOMING_TOKEN) {
      throw new AppError(401, 'UNAUTHORIZED');
    }

    const body = bodySchema.safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Invalid request body');

    await service.notifyPastaHouseNewOrder(body.data);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
