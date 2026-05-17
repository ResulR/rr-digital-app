// Raw DB row shapes — column names match the migration exactly.

export interface CompanyInfoRow {
  id: string;
  name: string;
  status: string;
}

// COUNT(*) always returns exactly one row; PostgreSQL returns the count as a
// string (bigint over the wire), so we parse it to number in the service.
export interface ProjectCountsRow {
  total: string;
  active: string;
}

export interface ScalarCountRow {
  count: string;
}

export interface DashboardEventRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  created_at: Date;
}

export interface DashboardSupportRow {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  created_at: Date;
}

export interface ProjectRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EventRow {
  id: string;
  company_id: string;
  project_id: string | null;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface SupportRequestRow {
  id: string;
  company_id: string;
  project_id: string | null;
  created_by_user_id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

// Public (camelCase) shapes returned by the API.

export interface PublicProject {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicEvent {
  id: string;
  companyId: string;
  projectId: string | null;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PublicSupportRequest {
  id: string;
  companyId: string;
  projectId: string | null;
  createdByUserId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Dashboard summary public shapes ─────────────────────────────────────────

// Slim event for the dashboard — no metadata, no companyId/projectId.
export interface PublicDashboardEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  createdAt: Date;
}

// Slim support request for the dashboard — no message, no companyId/userId.
export interface PublicDashboardSupportRequest {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  createdAt: Date;
}

export interface PublicDashboardSummary {
  company: {
    id: string;
    name: string;
    status: string;
  };
  counts: {
    projects: number;
    activeProjects: number;
    // Role-filtered: user sees only their open tickets.
    openSupportRequests: number;
    eventsLast7Days: number;
  };
  // 5 most recent events — all visible to every role.
  latestEvents: PublicDashboardEvent[];
  // 5 most recent support requests — role-filtered same as GET /support-requests.
  latestSupportRequests: PublicDashboardSupportRequest[];
}

export interface DashboardSummaryResponse {
  summary: PublicDashboardSummary;
}
