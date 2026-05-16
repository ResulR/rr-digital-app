import { AppError } from '../../utils/errors';
import * as repo from './companies.repository';
import type {
  EventRow,
  ProjectRow,
  PublicEvent,
  PublicProject,
  PublicSupportRequest,
  SupportRequestRow,
} from './companies.types';

// --- Transformers (snake_case DB → camelCase API) ---

function toProject(row: ProjectRow): PublicProject {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: EventRow): PublicEvent {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    type: row.type,
    title: row.title,
    description: row.description,
    severity: row.severity,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function toSupportRequest(row: SupportRequestRow): PublicSupportRequest {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Service functions ---

export async function getProjects(companyId: string): Promise<PublicProject[]> {
  const rows = await repo.listProjects(companyId);
  return rows.map(toProject);
}

export async function getEvents(
  companyId: string,
  limit: number,
  offset: number,
): Promise<PublicEvent[]> {
  const rows = await repo.listEvents(companyId, limit, offset);
  return rows.map(toEvent);
}

export async function getSupportRequests(
  companyId: string,
  options: {
    userId: string;
    companyRole: string;
    limit: number;
    offset: number;
  },
): Promise<PublicSupportRequest[]> {
  const rows = await repo.listSupportRequests(companyId, options);
  return rows.map(toSupportRequest);
}

export async function createSupportRequest(input: {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  projectId?: string;
}): Promise<PublicSupportRequest> {
  // Multi-tenant isolation: if a projectId is supplied, verify it belongs to
  // the same company before inserting. This prevents a user with access to
  // company A from linking a ticket to a project owned by company B.
  if (input.projectId !== undefined) {
    const belongs = await repo.projectBelongsToCompany(
      input.projectId,
      input.companyId,
    );
    if (!belongs) {
      throw new AppError(400, 'Project does not belong to this company');
    }
  }

  const row = await repo.createSupportRequest(input);
  return toSupportRequest(row);
}
