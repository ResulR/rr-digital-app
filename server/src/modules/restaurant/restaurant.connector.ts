import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type { RestaurantOrder, RestaurantOrderDetail } from './restaurant.types';

const TIMEOUT_MS = 8_000;

interface ConnectorConfig {
  baseUrl: string;
  token: string;
}

function getConfig(): ConnectorConfig {
  const baseUrl = env.PASTA_HOUSE_INTERNAL_API_BASE_URL;
  const token = env.PASTA_HOUSE_INTERNAL_TOKEN;

  if (!baseUrl || !token) {
    throw new AppError(503, 'INTEGRATION_NOT_CONFIGURED');
  }

  return { baseUrl, token };
}

async function get(path: string, config: ConnectorConfig): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'X-Internal-Token': config.token,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new AppError(404, 'Order not found');
    }

    if (!response.ok) {
      throw new AppError(502, 'INTEGRATION_ERROR');
    }

    const json = (await response.json()) as { ok: boolean; data?: unknown };

    if (!json.ok || !json.data) {
      throw new AppError(502, 'INTEGRATION_INVALID_RESPONSE');
    }

    return json.data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppError(504, 'INTEGRATION_TIMEOUT');
    }
    throw new AppError(502, 'INTEGRATION_UNAVAILABLE');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function patch(
  path: string,
  body: Record<string, unknown>,
  config: ConnectorConfig,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'X-Internal-Token': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new AppError(404, 'Order not found');
    }

    if (response.status === 400) {
      const json = (await response.json().catch(() => ({}))) as {
        ok: boolean;
        error?: string;
      };
      throw new AppError(400, json.error ?? 'INVALID_STATUS_TRANSITION');
    }

    if (!response.ok) {
      throw new AppError(502, 'INTEGRATION_ERROR');
    }

    const json = (await response.json()) as { ok: boolean; data?: unknown };

    if (!json.ok || !json.data) {
      throw new AppError(502, 'INTEGRATION_INVALID_RESPONSE');
    }

    return json.data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppError(504, 'INTEGRATION_TIMEOUT');
    }
    throw new AppError(502, 'INTEGRATION_UNAVAILABLE');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchOrders(params: {
  date?: string;
  status?: string;
  limit?: number;
}): Promise<RestaurantOrder[]> {
  const config = getConfig();

  const search = new URLSearchParams();
  if (params.date) search.set('date', params.date);
  if (params.status) search.set('status', params.status);
  if (params.limit !== undefined) search.set('limit', String(params.limit));

  const qs = search.toString();
  const path = `/orders${qs ? `?${qs}` : ''}`;

  const data = (await get(path, config)) as { orders: RestaurantOrder[] };
  return data.orders;
}

export async function fetchOrderById(orderId: string): Promise<RestaurantOrderDetail> {
  const config = getConfig();
  const data = (await get(
    `/orders/${encodeURIComponent(orderId)}`,
    config,
  )) as { order: RestaurantOrderDetail };
  return data.order;
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<RestaurantOrderDetail> {
  const config = getConfig();
  const data = (await patch(
    `/orders/${encodeURIComponent(orderId)}/status`,
    { status },
    config,
  )) as { order: RestaurantOrderDetail };
  return data.order;
}
