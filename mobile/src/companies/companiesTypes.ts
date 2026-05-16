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
