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

// Mirrors server/src/modules/companies/companies.types.ts PublicSupportRequest.
export interface SupportRequest {
  id: string;
  companyId: string;
  projectId: string | null;
  createdByUserId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportRequestsResponse {
  supportRequests: SupportRequest[];
}

// Only the fields the mobile can supply — company_id, created_by_user_id,
// status, and project_id are set server-side and must NOT be in this type.
export interface CreateSupportRequestInput {
  title: string;
  message: string;
  type: 'technical' | 'modification' | 'billing' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface CreateSupportRequestResponse {
  supportRequest: SupportRequest;
}
