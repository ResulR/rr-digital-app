import { getPool } from '../../db/pool';

export interface UpsertDeviceTokenInput {
  userId: string;
  platform: 'ios' | 'android' | 'web';
  expoPushToken: string;
}

export async function upsertDeviceToken(input: UpsertDeviceTokenInput): Promise<void> {
  await getPool().query(
    `INSERT INTO device_tokens (user_id, platform, expo_push_token, last_seen_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, expo_push_token)
     DO UPDATE SET platform = EXCLUDED.platform, last_seen_at = now()`,
    [input.userId, input.platform, input.expoPushToken],
  );
}

export async function listActiveCompanyUsers(companyId: string): Promise<string[]> {
  const result = await getPool().query<{ id: string }>(
    `SELECT u.id
     FROM users u
     JOIN company_users cu ON cu.user_id = u.id
     WHERE cu.company_id = $1
       AND cu.status = 'active'
       AND u.status = 'active'`,
    [companyId],
  );
  return result.rows.map((r) => r.id);
}

export async function listDeviceTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const result = await getPool().query<{ expo_push_token: string }>(
    `SELECT expo_push_token
     FROM device_tokens
     WHERE user_id = ANY($1)
       AND expo_push_token != ''`,
    [userIds],
  );
  return result.rows.map((r) => r.expo_push_token);
}

export interface CreateNotificationInput {
  companyId: string;
  userId: string | null;
  title: string;
  body: string;
  type: string;
  metadata: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await getPool().query(
    `INSERT INTO notifications (company_id, user_id, title, body, type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.companyId, input.userId, input.title, input.body, input.type, JSON.stringify(input.metadata)],
  );
}
