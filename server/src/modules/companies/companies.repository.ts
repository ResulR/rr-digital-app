import { getPool } from '../../db/pool';
import type {
  CompanyInfoRow,
  DashboardEventRow,
  DashboardSupportRow,
  EventRow,
  ProjectCountsRow,
  ProjectRow,
  ScalarCountRow,
  SupportRequestRow,
} from './companies.types';

export async function listProjects(companyId: string): Promise<ProjectRow[]> {
  const result = await getPool().query<ProjectRow>(
    `SELECT id, company_id, name, description, type, status, url,
            created_at, updated_at
       FROM projects
      WHERE company_id = $1
      ORDER BY name ASC`,
    [companyId],
  );
  return result.rows;
}

export async function listEvents(
  companyId: string,
  limit: number,
  offset: number,
): Promise<EventRow[]> {
  const result = await getPool().query<EventRow>(
    `SELECT id, company_id, project_id, type, title, description,
            severity, metadata, created_at
       FROM events
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [companyId, limit, offset],
  );
  return result.rows;
}

export async function listSupportRequests(
  companyId: string,
  options: {
    userId: string;
    companyRole: string;
    limit: number;
    offset: number;
  },
): Promise<SupportRequestRow[]> {
  const { userId, companyRole, limit, offset } = options;

  // admin and superadmin see all tickets for the company.
  // regular user sees only tickets they created (created_by_user_id = userId).
  const isAdminLevel = companyRole === 'admin' || companyRole === 'superadmin';

  if (isAdminLevel) {
    const result = await getPool().query<SupportRequestRow>(
      `SELECT id, company_id, project_id, created_by_user_id,
              title, message, type, priority, status,
              created_at, updated_at
         FROM support_requests
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    );
    return result.rows;
  }

  // Regular user: own tickets only.
  const result = await getPool().query<SupportRequestRow>(
    `SELECT id, company_id, project_id, created_by_user_id,
            title, message, type, priority, status,
            created_at, updated_at
       FROM support_requests
      WHERE company_id = $1
        AND created_by_user_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4`,
    [companyId, userId, limit, offset],
  );
  return result.rows;
}

/**
 * Returns true if the project exists AND belongs to the given company.
 * Used to enforce multi-tenant isolation before inserting a support_request
 * with a projectId supplied by the client.
 */
export async function projectBelongsToCompany(
  projectId: string,
  companyId: string,
): Promise<boolean> {
  const result = await getPool().query<{ exists: boolean }>(
    `SELECT 1
       FROM projects
      WHERE id = $1
        AND company_id = $2
      LIMIT 1`,
    [projectId, companyId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Dashboard summary — all queries run in parallel via Promise.all.
// Role-based filtering is identical to listSupportRequests:
//   admin/superadmin → all company tickets
//   user             → own tickets only (created_by_user_id = userId)
// ---------------------------------------------------------------------------
export async function getDashboardData(
  companyId: string,
  userId: string,
  companyRole: string,
): Promise<{
  company: CompanyInfoRow | null;
  projectCounts: ProjectCountsRow;
  openSupportCount: string;
  eventsLast7DaysCount: string;
  latestEvents: DashboardEventRow[];
  latestSupportRequests: DashboardSupportRow[];
}> {
  const pool = getPool();
  const isAdminLevel = companyRole === 'admin' || companyRole === 'superadmin';

  const [
    companyResult,
    projectCountsResult,
    openSupportResult,
    eventsCountResult,
    latestEventsResult,
    latestSupportResult,
  ] = await Promise.all([
    // Company info — needed to return name/status in the summary.
    pool.query<CompanyInfoRow>(
      `SELECT id, name, status FROM companies WHERE id = $1`,
      [companyId],
    ),

    // Total + active project counts in one pass.
    pool.query<ProjectCountsRow>(
      `SELECT
         COUNT(*)                                     AS total,
         COUNT(*) FILTER (WHERE status = 'active')   AS active
       FROM projects
       WHERE company_id = $1`,
      [companyId],
    ),

    // Open support requests — role-filtered.
    isAdminLevel
      ? pool.query<ScalarCountRow>(
          `SELECT COUNT(*) AS count
             FROM support_requests
            WHERE company_id = $1
              AND status = 'open'`,
          [companyId],
        )
      : pool.query<ScalarCountRow>(
          `SELECT COUNT(*) AS count
             FROM support_requests
            WHERE company_id           = $1
              AND status               = 'open'
              AND created_by_user_id   = $2`,
          [companyId, userId],
        ),

    // Events in the last 7 days — same for all roles.
    pool.query<ScalarCountRow>(
      `SELECT COUNT(*) AS count
         FROM events
        WHERE company_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'`,
      [companyId],
    ),

    // Latest 5 events — slim shape, same for all roles.
    pool.query<DashboardEventRow>(
      `SELECT id, type, title, description, severity, created_at
         FROM events
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT 5`,
      [companyId],
    ),

    // Latest 5 support requests — role-filtered, slim shape.
    isAdminLevel
      ? pool.query<DashboardSupportRow>(
          `SELECT id, title, type, priority, status, created_at
             FROM support_requests
            WHERE company_id = $1
            ORDER BY created_at DESC
            LIMIT 5`,
          [companyId],
        )
      : pool.query<DashboardSupportRow>(
          `SELECT id, title, type, priority, status, created_at
             FROM support_requests
            WHERE company_id         = $1
              AND created_by_user_id = $2
            ORDER BY created_at DESC
            LIMIT 5`,
          [companyId, userId],
        ),
  ]);

  return {
    company: companyResult.rows[0] ?? null,
    // COUNT(*) always returns one row — safe to assert non-null.
    projectCounts: projectCountsResult.rows[0] as ProjectCountsRow,
    openSupportCount: (openSupportResult.rows[0] as ScalarCountRow).count,
    eventsLast7DaysCount: (eventsCountResult.rows[0] as ScalarCountRow).count,
    latestEvents: latestEventsResult.rows,
    latestSupportRequests: latestSupportResult.rows,
  };
}

export async function createSupportRequest(input: {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  projectId?: string;
}): Promise<SupportRequestRow> {
  const result = await getPool().query<SupportRequestRow>(
    `INSERT INTO support_requests
       (company_id, project_id, created_by_user_id,
        title, message, type, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
     RETURNING id, company_id, project_id, created_by_user_id,
               title, message, type, priority, status,
               created_at, updated_at`,
    [
      input.companyId,
      input.projectId ?? null,
      input.userId,
      input.title,
      input.message,
      input.type,
      input.priority,
    ],
  );
  return result.rows[0];
}
