// Types for the restaurant_orders module.
// Mirrors server/src/modules/restaurant/restaurant.types.ts — no Stripe fields exposed.

export type RestaurantOrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'completed'
  | 'cancelled'
  | 'payment_failed';

export type RestaurantFulfillmentMethod = 'delivery' | 'pickup';

// The 5 statuses that an operator can set via RR Digital App.
// Payment-related statuses are intentionally excluded.
export type RestaurantWritableStatus =
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'completed'
  | 'cancelled';

export interface RestaurantOrderItem {
  id: string;
  lineNumber: number;
  itemType: 'product' | 'beverage';
  productNameSnapshot: string | null;
  variantCodeSnapshot: string | null;
  variantNameSnapshot: string | null;
  beverageNameSnapshot: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  status: RestaurantOrderStatus;
  fulfillmentMethod: RestaurantFulfillmentMethod;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  totalCents: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantOrderDetail extends RestaurantOrder {
  deliveryAddressLine1: string | null;
  deliveryPostalCode: string | null;
  deliveryCity: string | null;
  customerNote: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  items: RestaurantOrderItem[];
}

export interface RestaurantOrdersResponse {
  orders: RestaurantOrder[];
}

export interface RestaurantOrderDetailResponse {
  order: RestaurantOrderDetail;
}

// --- Schedule types (Step 9C) ---

export interface OpeningHour {
  dayKey: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface ExceptionalClosure {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface ScheduleOverride {
  id: string;
  serviceDate: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  note: string | null;
}

export interface StoreStatus {
  ordersEnabled: boolean;
  ordersDisabledReason: string | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  rushModeEnabled: boolean;
}

export interface StoreAvailability {
  isOpen: boolean;
  reason: string | null;
  message: string | null;
}

export interface RestaurantScheduleData {
  openingHours: OpeningHour[];
  closures: ExceptionalClosure[];
  overrides: ScheduleOverride[];
  storeStatus: StoreStatus;
  storeAvailability: StoreAvailability;
}

export interface RestaurantOrdersEnabledData {
  storeStatus: StoreStatus;
  storeAvailability: StoreAvailability;
}
