import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchRestaurantOrderDetail } from '../../src/restaurant/restaurantApi';
import type {
  RestaurantOrderDetail,
  RestaurantOrderItem,
} from '../../src/restaurant/restaurantTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const MODULE_KEY = 'restaurant_orders';

// --- Helpers ---------------------------------------------------------------

function labelForStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'awaiting_payment':
      return 'Paiement attendu';
    case 'paid':
      return 'Payee';
    case 'preparing':
      return 'Preparation';
    case 'ready':
      return 'Prete';
    case 'in_delivery':
      return 'En livraison';
    case 'completed':
      return 'Terminee';
    case 'cancelled':
      return 'Annulee';
    case 'payment_failed':
      return 'Paiement echoue';
    default:
      return status;
  }
}

function colorForStatus(status: string): string {
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

function labelForFulfillment(method: string): string {
  switch (method) {
    case 'delivery':
      return 'Livraison';
    case 'pickup':
      return 'Retrait';
    default:
      return method;
  }
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' EUR';
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function itemLabel(item: RestaurantOrderItem): string {
  if (item.itemType === 'beverage' && item.beverageNameSnapshot) {
    return item.beverageNameSnapshot;
  }
  const parts: string[] = [];
  if (item.productNameSnapshot) parts.push(item.productNameSnapshot);
  if (item.variantNameSnapshot) parts.push(item.variantNameSnapshot);
  return parts.join(' - ') || '—';
}

// --- Sub-components --------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ItemRow({ item }: { item: RestaurantOrderItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemName}>{itemLabel(item)}</Text>
        {item.variantCodeSnapshot ? (
          <Text style={styles.itemVariantCode}>{item.variantCodeSnapshot}</Text>
        ) : null}
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemQty}>x{item.quantity}</Text>
        <Text style={styles.itemTotal}>{formatCents(item.lineTotalCents)}</Text>
      </View>
    </View>
  );
}

// --- Screen ----------------------------------------------------------------

export default function RestaurantOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { authenticatedRequest } = useAuth();
  const { selectedCompany } = useCompany();
  const [order, setOrder] = useState<RestaurantOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasModule = selectedCompany?.modules.includes(MODULE_KEY) ?? false;

  useEffect(() => {
    if (!selectedCompany || !hasModule || !orderId) return;

    setIsLoading(true);
    setError(null);

    fetchRestaurantOrderDetail(selectedCompany.id, orderId, authenticatedRequest)
      .then((result) => {
        setOrder(result.order);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Impossible de charger la commande.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedCompany, hasModule, orderId, authenticatedRequest]);

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          hitSlop={12}
        >
          <Text style={styles.backButtonText}>{'< Commandes'}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>DETAIL COMMANDE</Text>
        {order ? (
          <Text style={styles.title}>#{order.orderNumber}</Text>
        ) : (
          <Text style={styles.title}>Commande</Text>
        )}
      </View>

      {/* Module not enabled */}
      {!hasModule && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Module non disponible pour cette entreprise.
          </Text>
        </View>
      )}

      {/* Loading */}
      {hasModule && isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {/* Error */}
      {hasModule && !isLoading && error && (
        <View style={styles.bodyGap}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Impossible de charger la commande.</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryLabel}>Retour</Text>
          </Pressable>
        </View>
      )}

      {/* Order detail */}
      {hasModule && !isLoading && !error && order && (
        <View style={styles.bodyGap}>
          {/* Status + fulfillment */}
          <SectionCard title="Statut">
            <View style={styles.statusRow}>
              <View
                style={[styles.statusBadge, { borderColor: colorForStatus(order.status) }]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: colorForStatus(order.status) },
                  ]}
                >
                  {labelForStatus(order.status)}
                </Text>
              </View>
              <Text style={styles.fulfillmentText}>
                {labelForFulfillment(order.fulfillmentMethod)}
              </Text>
            </View>
            <DetailRow label="Date" value={formatDate(order.createdAt)} />
            {order.paidAt ? (
              <DetailRow label="Paye le" value={formatDate(order.paidAt)} />
            ) : null}
          </SectionCard>

          {/* Client */}
          <SectionCard title="Client">
            {order.customerName ? (
              <DetailRow label="Nom" value={order.customerName} />
            ) : null}
            <DetailRow label="Email" value={order.customerEmail} />
            <DetailRow label="Tel." value={order.customerPhone} />
            {order.fulfillmentMethod === 'delivery' && order.deliveryAddressLine1 ? (
              <View>
                <DetailRow label="Adresse" value={order.deliveryAddressLine1} />
                {order.deliveryPostalCode || order.deliveryCity ? (
                  <DetailRow
                    label=""
                    value={[order.deliveryPostalCode, order.deliveryCity]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ) : null}
              </View>
            ) : null}
            {order.customerNote ? (
              <DetailRow label="Note" value={order.customerNote} />
            ) : null}
          </SectionCard>

          {/* Articles */}
          {order.items.length > 0 && (
            <SectionCard title="Articles">
              {order.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </SectionCard>
          )}

          {/* Total */}
          <SectionCard title="Total">
            <DetailRow label="Sous-total" value={formatCents(order.subtotalCents)} />
            {order.fulfillmentMethod === 'delivery' && (
              <DetailRow
                label="Livraison"
                value={formatCents(order.deliveryFeeCents)}
              />
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCents(order.totalCents)}</Text>
            </View>
          </SectionCard>
        </View>
      )}
    </AppScreen>
  );
}

// --- Styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backButtonPressed: {
    opacity: 0.5,
  },
  backButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  eyebrow: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.display,
    color: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  bodyGap: {
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionCardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fulfillmentText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
  },
  detailValue: {
    ...typography.small,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemVariantCode: {
    ...typography.small,
    color: colors.textMuted,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemQty: {
    ...typography.small,
    color: colors.textSecondary,
  },
  itemTotal: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  totalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  infoBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  infoText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FBEEEC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6BFB7',
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: '#8A2A1B',
  },
  errorMessage: {
    ...typography.small,
    color: '#8A2A1B',
  },
  retryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  retryButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  retryLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
