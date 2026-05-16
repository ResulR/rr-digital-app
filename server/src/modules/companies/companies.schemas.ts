import { z } from 'zod';

export const companyParamsSchema = z.object({
  companyId: z.string().uuid('Company ID must be a valid UUID'),
});

// Optional pagination for list endpoints.
// limit: 1–50, default 20. offset: 0+, default 0.
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// POST /support-requests body validation.
// company_id comes from params; status/created_by come from server — never from body.
export const createSupportRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters')
    .max(5000, 'Message must be at most 5000 characters'),
  type: z
    .enum(['technical', 'modification', 'billing', 'other'])
    .default('other'),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'])
    .default('normal'),
  // Optional: link to a specific project.
  projectId: z.string().uuid('Project ID must be a valid UUID').optional(),
});

export type CompanyParams = z.infer<typeof companyParamsSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type CreateSupportRequestInput = z.infer<typeof createSupportRequestSchema>;
