// Company-scoped API calls.
// All functions receive authenticatedRequest from AuthContext so that
// the Bearer token and 401-retry logic are handled centrally.
// Never call apiRequest directly here — these routes require auth.

import type { EventsResponse, ProjectsResponse } from './companiesTypes';

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
