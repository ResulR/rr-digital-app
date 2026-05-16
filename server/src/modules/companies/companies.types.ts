// Raw DB row shapes — column names match the migration exactly.

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
