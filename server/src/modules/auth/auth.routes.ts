import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { AppError } from '../../utils/errors';
import { loginSchema, logoutSchema, refreshSchema } from './auth.schemas';
import * as service from './auth.service';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }
    const result = await service.login(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }
    const result = await service.refresh(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const parsed = logoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }
    await service.logout(parsed.data);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Authentication required');
    }
    const result = await service.getMe(req.auth.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
