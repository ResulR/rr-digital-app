import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { requireCompanyAccess } from '../../middlewares/companyAccess';
import { AppError } from '../../utils/errors';
import {
  companyParamsSchema,
  createSupportRequestSchema,
  paginationSchema,
} from './companies.schemas';
import * as service from './companies.service';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/companies/:companyId/projects
// Returns all projects for the company, ordered by name.
// Auth: any active member. SuperAdmin bypass included via requireCompanyAccess.
// ---------------------------------------------------------------------------
router.get(
  '/:companyId/projects',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      const params = companyParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'Invalid company ID');
      }

      const projects = await service.getProjects(params.data.companyId);
      res.json({ projects });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/companies/:companyId/events
// Returns events ordered by created_at DESC. Supports ?limit=&offset=.
// Auth: any active member.
// ---------------------------------------------------------------------------
router.get(
  '/:companyId/events',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      const params = companyParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'Invalid company ID');
      }

      const pagination = paginationSchema.safeParse(req.query);
      if (!pagination.success) {
        throw new AppError(400, 'Invalid pagination parameters');
      }

      const events = await service.getEvents(
        params.data.companyId,
        pagination.data.limit,
        pagination.data.offset,
      );
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/companies/:companyId/support-requests
// admin/superadmin: see all tickets for the company.
// user: see only their own tickets (filtered by created_by_user_id).
// Supports ?limit=&offset=.
// ---------------------------------------------------------------------------
router.get(
  '/:companyId/support-requests',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      if (!req.auth || !req.companyRole) {
        throw new AppError(401, 'Authentication required');
      }

      const params = companyParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'Invalid company ID');
      }

      const pagination = paginationSchema.safeParse(req.query);
      if (!pagination.success) {
        throw new AppError(400, 'Invalid pagination parameters');
      }

      const supportRequests = await service.getSupportRequests(
        params.data.companyId,
        {
          userId: req.auth.userId,
          companyRole: req.companyRole,
          limit: pagination.data.limit,
          offset: pagination.data.offset,
        },
      );
      res.json({ supportRequests });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/companies/:companyId/support-requests
// Any active member can create a ticket.
// company_id from params. created_by_user_id from JWT. status always 'open'.
// ---------------------------------------------------------------------------
router.post(
  '/:companyId/support-requests',
  requireAuth,
  requireCompanyAccess,
  async (req, res, next) => {
    try {
      if (!req.auth) {
        throw new AppError(401, 'Authentication required');
      }

      const params = companyParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError(400, 'Invalid company ID');
      }

      const body = createSupportRequestSchema.safeParse(req.body);
      if (!body.success) {
        throw new AppError(400, 'Invalid request body');
      }

      const supportRequest = await service.createSupportRequest({
        companyId: params.data.companyId,
        userId: req.auth.userId, // enforced from JWT — never trusted from body
        title: body.data.title,
        message: body.data.message,
        type: body.data.type,
        priority: body.data.priority,
        projectId: body.data.projectId,
      });

      res.status(201).json({ supportRequest });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
