import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth';
import { AppError } from '../utils/errors';
import * as service from '../modules/notifications/notifications.service';

const router = Router();

const bodySchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  expoPushToken: z.string().min(1).max(300),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) throw new AppError(400, 'Invalid request body');

    const result = await service.registerDeviceToken(req.auth!.userId, body.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
