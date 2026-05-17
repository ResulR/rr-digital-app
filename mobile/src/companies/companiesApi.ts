// Company-scoped API calls.
// All functions receive authenticatedRequest from AuthContext so that
// the Bearer token and 401-retry logic are handled centrally.
// Never call apiRequest directly here — these routes require auth.

import type {
  CreateSupportRequestInput,
  CreateSupportRequestResponse,
  DashboardSummaryResponse,
  EventsResponse,
  ProjectsResponse,
  SupportRequestsResponse,
} from './companiesTypes';

// Type alias matching the authenticatedRequest signature in AuthContext.
type AuthenticatedRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export async function fetchProjects(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
): Promise<ProjectsResponse> {
  return authenticatedRequest<ProjectsResponse>(`/companies/${companyId}/projects`);
}

export async function fetchEvents(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
  limit = 20,
): Promise<EventsResponse> {
  return authenticatedRequest<EventsResponse>(
    `/companies/${companyId}/events?limit=${limit}`,
  );
}

export async function fetchSupportRequests(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
  limit = 20,
): Promise<SupportRequestsResponse> {
  return authenticatedRequest<SupportRequestsResponse>(
    `/companies/${companyId}/support-requests?limit=${limit}`,
  );
}

// Aggregated home-screen summary — one call instead of three.
// companyId comes from CompanyContext (never hardcoded).
export async function fetchDashboardSummary(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
): Promise<DashboardSummaryResponse> {
  return authenticatedRequest<DashboardSummaryResponse>(
    `/companies/${companyId}/dashboard-summary`,
  );
}

// company_id comes from the URL param — never from the body.
// created_by_user_id and status are set server-side from the JWT.
export async function createSupportRequest(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
  input: CreateSupportRequestInput,
): Promise<CreateSupportRequestResponse> {
  return authenticatedRequest<CreateSupportRequestResponse>(
    `/companies/${companyId}/support-requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}
