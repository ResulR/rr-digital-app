// Restaurant orders API helpers.
// All functions receive authenticatedRequest from AuthContext so that
// the Bearer token and 401-retry logic are handled centrally.
// Never call apiRequest directly here — these routes require auth.
// The mobile calls RR Digital backend only — never Pasta House directly.

import type {
  RestaurantOrderDetailResponse,
  RestaurantOrdersResponse,
} from './restaurantTypes';

// Type alias matching the authenticatedRequest signature in AuthContext.
type AuthenticatedRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export interface FetchOrdersParams {
  date?: 'today';
  status?: string;
  limit?: number;
}

export async function fetchRestaurantOrders(
  companyId: string,
  authenticatedRequest: AuthenticatedRequest,
  params?: FetchOrdersParams,
): Promise<RestaurantOrdersResponse> {
  const search = new URLSearchParams();
  if (params?.date) search.set('date', params.date);
  if (params?.status) search.set('status', params.status);
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  const path = `/companies/${companyId}/restaurant-orders${qs ? `?${qs}` : ''}`;
  return authenticatedRequest<RestaurantOrdersResponse>(path);
}

export async function fetchRestaurantOrderDetail(
  companyId: string,
  orderId: string,
  authenticatedRequest: AuthenticatedRequest,
): Promise<RestaurantOrderDetailResponse> {
  return authenticatedRequest<RestaurantOrderDetailResponse>(
    `/companies/${companyId}/restaurant-orders/${encodeURIComponent(orderId)}`,
  );
}
