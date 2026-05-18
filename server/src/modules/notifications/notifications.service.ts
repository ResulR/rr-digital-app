import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import * as repo from './notifications.repository';

export interface RegisterDeviceTokenInput {
  platform: 'ios' | 'android' | 'web';
  expoPushToken: string;
}

export async function registerDeviceToken(
  userId: string,
  input: RegisterDeviceTokenInput,
): Promise<{ ok: true }> {
  await repo.upsertDeviceToken({
    userId,
    platform: input.platform,
    expoPushToken: input.expoPushToken,
  });
  return { ok: true };
}

export interface NotifyPastaHouseNewOrderInput {
  companyId: string;
  orderId: string;
  orderNumber?: string | null;
  totalCents?: number | null;
  fulfillmentMethod?: string | null;
}

export async function notifyPastaHouseNewOrder(
  input: NotifyPastaHouseNewOrderInput,
): Promise<void> {
  if (!env.PASTA_HOUSE_COMPANY_ID) {
    throw new AppError(503, 'INTERNAL_INTEGRATION_NOT_CONFIGURED');
  }
  if (input.companyId !== env.PASTA_HOUSE_COMPANY_ID) {
    throw new AppError(400, 'INVALID_COMPANY_ID');
  }

  const userIds = await repo.listActiveCompanyUsers(input.companyId);
  if (userIds.length === 0) return;

  const title = 'Nouvelle commande Pasta House';
  const body = input.orderNumber
    ? `Commande ${input.orderNumber} payée.`
    : 'Une nouvelle commande a été payée.';

  const metadata: Record<string, unknown> = {
    source: 'pasta_house',
    orderId: input.orderId,
    ...(input.orderNumber != null && { orderNumber: input.orderNumber }),
    ...(input.totalCents != null && { totalCents: input.totalCents }),
    ...(input.fulfillmentMethod != null && { fulfillmentMethod: input.fulfillmentMethod }),
  };

  await Promise.all(
    userIds.map((userId) =>
      repo.createNotification({
        companyId: input.companyId,
        userId,
        title,
        body,
        type: 'restaurant_order',
        metadata,
      }),
    ),
  );

  // Best-effort push: DB notifications are committed; Expo failure does not throw.
  const tokens = await repo.listDeviceTokensForUsers(userIds);
  if (tokens.length === 0) return;

  const pushMessages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data: {
      type: 'restaurant_order',
      companyId: input.companyId,
      orderId: input.orderId,
      orderNumber: input.orderNumber ?? null,
    },
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(pushMessages),
    });
    if (!response.ok) {
      console.error('[push] Expo push returned non-OK status:', response.status);
    }
  } catch (err) {
    console.error('[push] Expo push failed:', err instanceof Error ? err.message : 'unknown error');
  }
}
