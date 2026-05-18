// Shared display helpers for the restaurant module.
// Used by restaurant-orders/index.tsx and restaurant-orders/[orderId].tsx.

import { colors } from '../theme/colors';

export function labelForStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'awaiting_payment':
      return 'Paiement attendu';
    case 'paid':
      return 'Payée';
    case 'preparing':
      return 'Préparation';
    case 'ready':
      return 'Prête';
    case 'in_delivery':
      return 'En livraison';
    case 'completed':
      return 'Terminée';
    case 'cancelled':
      return 'Annulée';
    case 'payment_failed':
      return 'Paiement échoué';
    default:
      return status;
  }
}

export function colorForStatus(status: string): string {
  switch (status) {
    case 'paid':
    case 'completed':
      return '#2D7A45';
    case 'cancelled':
    case 'payment_failed':
      return '#C0392B';
    case 'preparing':
    case 'ready':
      return colors.primary;
    case 'in_delivery':
      return '#2980B9';
    default:
      return colors.textMuted;
  }
}

export function labelForFulfillment(method: string): string {
  switch (method) {
    case 'delivery':
      return 'Livraison';
    case 'pickup':
      return 'Retrait';
    default:
      return method;
  }
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

// Format a datetime string for order display (date + hour:minute, fr-BE).
export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
