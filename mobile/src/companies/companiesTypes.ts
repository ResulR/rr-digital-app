// Types for company-scoped data.
// CompanyAccess and MeResponse live in authTypes.ts — no duplication here.

// Mirrors server/src/modules/companies/companies.types.ts PublicProject.
export interface Project {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

// Named CompanyEvent to avoid collision with the global DOM Event type.
// Mirrors server/src/modules/companies/companies.types.ts PublicEvent.
export interface CompanyEvent {
  id: string;
  companyId: string;
  projectId: string | null;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EventsResponse {
  events: CompanyEvent[];
}
