import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchRestaurantOrderDetail, updateRestaurantOrderStatus } from '../../src/restaurant/restaurantApi';
import type {
  RestaurantOrderDetail,
  RestaurantOrderItem,
  RestaurantWritableStatus,
} from '../../src/restaurant/restaurantTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const MODULE_KEY = 'restaurant_orders';

const WRITABLE_STATUSES: { status: RestaurantWritableStatus; label: string }[] = [
  { status: 'preparing', label: 'En preparation' },
  { status: 'ready', label: 'Prete' },
  { status: 'in_delivery', label: 'En livraison' },
  { status: 'completed', label: 'Terminee' },
  { status: 'cancelled', label: 'Annulee' },
];

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
  return parts.join(' - ') || '-';
}

// Open an external URL (tel: or mailto:). Errors swallowed silently.
function openUrl(url: string): void {
  Linking.openURL(url).catch(() => {});
}

// --- Sub-components --------------------------------------------------------

// Top summary card - status, mode, total and date at a glance.
function SummaryCard({ order }: { order: RestaurantOrderDetail }) {
  const statusColor = colorForStatus(order.status);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={[styles.statusBadgeLg, { borderColor: statusColor }]}>
          <Text style={[styles.statusBadgeLgText, { color: statusColor }]}>
            {labelForStatus(order.status)}
          </Text>
        </View>
        <View style={styles.fulfillmentPill}>
          <Text style={styles.fulfillmentPillText}>
            {labelForFulfillment(order.fulfillmentMethod)}
          </Text>
        </View>
      </View>
      <Text style={styles.summaryTotal}>{formatCents(order.totalCents)}</Text>
      <Text style={styles.summaryDate}>{formatDate(order.createdAt)}</Text>
      {order.paidAt ? (
        <Text style={styles.summaryPaidAt}>
          {'Paye le ' + formatDate(order.paidAt)}
        </Text>
      ) : null}
    </View>
  );
}

// Section wrapper card with a title.
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

// Static info row (label left, value right).
function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// Tappable contact row - opens tel: or mailto: link.
function ContactRow({
  label,
  value,
  url,
}: {
  label: string;
  value: string;
  url: string;
}) {
  if (!value) return null;
  return (
    <Pressable
      style={({ pressed }) => [styles.detailRow, pressed && styles.contactRowPressed]}
      onPress={() => openUrl(url)}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, styles.linkText]}>{value}</Text>
    </Pressable>
  );
}

// Highlighted note box shown when customerNote is present.
function NoteBox({ note }: { note: string }) {
  return (
    <View style={styles.noteBox}>
      <Text style={styles.noteLabel}>Note client</Text>
      <Text style={styles.noteText}>{note}</Text>
    </View>
  );
}

// One article line - name, variant, unit price x qty -> line total.
function ItemRow({ item }: { item: RestaurantOrderItem }) {
  const name = itemLabel(item);
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemMain}>
        <Text style={styles.itemName}>{name}</Text>
        {item.variantCodeSnapshot ? (
          <Text style={styles.itemVariantCode}>{item.variantCodeSnapshot}</Text>
        ) : null}
        <Text style={styles.itemUnitPrice}>
          {formatCents(item.unitPriceCents)} x {item.quantity}
        </Text>
      </View>
      <Text style={styles.itemLineTotal}>{formatCents(item.lineTotalCents)}</Text>
    </View>
  );
}

// --- Status actions --------------------------------------------------------

function StatusActionsCard({
  order,
  isUpdating,
  statusError,
  onAction,
}: {
  order: RestaurantOrderDetail;
  isUpdating: boolean;
  statusError: string | null;
  onAction: (status: RestaurantWritableStatus, label: string) => void;
}) {
  const available = WRITABLE_STATUSES.filter(({ status }) => {
    if (status === order.status) return false;
    if (status === 'in_delivery' && order.fulfillmentMethod === 'pickup') return false;
    return true;
  });

  return (
    <View style={styles.actionsCard}>
      <Text style={styles.actionsCardTitle}>Actions statut</Text>
      {isUpdating ? (
        <View style={styles.actionsUpdating}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.actionsUpdatingText}>Mise a jour...</Text>
        </View>
      ) : null}
      {!isUpdating && statusError ? (
        <Text style={styles.actionsErrorText}>{statusError}</Text>
      ) : null}
      {!isUpdating && available.length === 0 ? (
        <Text style={styles.actionsEmptyText}>Aucune action disponible.</Text>
      ) : null}
      {!isUpdating && available.length > 0 ? (
        <View style={styles.actionButtons}>
          {available.map(({ status, label }) => (
            <Pressable
              key={status}
              style={({ pressed }) => [
                styles.actionButton,
                status === 'cancelled' && styles.actionButtonDanger,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => onAction(status, label)}
              disabled={isUpdating}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  status === 'cancelled' && styles.actionButtonTextDanger,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

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

  const doUpdateStatus = useCallback(
    async (status: RestaurantWritableStatus) => {
      if (!selectedCompany || !orderId) return;
      setIsUpdatingStatus(true);
      setStatusError(null);
      try {
        const result = await updateRestaurantOrderStatus(
          selectedCompany.id,
          orderId,
          status,
          authenticatedRequest,
        );
        setOrder(result.order);
      } catch {
        setStatusError('Impossible de changer le statut.');
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [selectedCompany, orderId, authenticatedRequest],
  );

  const handleStatusChange = useCallback(
    (status: RestaurantWritableStatus, label: string) => {
      Alert.alert(
        'Confirmer le changement',
        'Passer la commande en ' + label + ' ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: status === 'cancelled' ? 'destructive' : 'default',
            onPress: () => { doUpdateStatus(status); },
          },
        ],
      );
    },
    [doUpdateStatus],
  );

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

          {/* 1. Summary card - status / mode / total / date */}
          <SummaryCard order={order} />

          {/* 2. Actions statut */}
          <StatusActionsCard
            order={order}
            isUpdating={isUpdatingStatus}
            statusError={statusError}
            onAction={handleStatusChange}
          />

          {/* 3. Note client - highlighted if present */}
          {order.customerNote ? (
            <NoteBox note={order.customerNote} />
          ) : null}

          {/* 4. Client - phone and email tappable */}
          <SectionCard title="Client">
            {order.customerName ? (
              <DetailRow label="Nom" value={order.customerName} />
            ) : null}
            <ContactRow
              label="Tel."
              value={order.customerPhone}
              url={'tel:' + order.customerPhone}
            />
            <ContactRow
              label="Email"
              value={order.customerEmail}
              url={'mailto:' + order.customerEmail}
            />
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
          </SectionCard>

          {/* 5. Articles */}
          {order.items.length > 0 && (
            <SectionCard title="Articles">
              {order.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </SectionCard>
          )}

          {/* 6. Total breakdown */}
          <SectionCard title="Total">
            <DetailRow
              label="Sous-total"
              value={formatCents(order.subtotalCents)}
            />
            {order.fulfillmentMethod === 'delivery' && (
              <DetailRow
                label="Livraison"
                value={formatCents(order.deliveryFeeCents)}
              />
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCents(order.totalCents)}
              </Text>
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

  // --- Summary card --------------------------------------------------------
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadgeLg: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1.5,
  },
  statusBadgeLgText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  fulfillmentPill: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fulfillmentPillText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  summaryDate: {
    ...typography.small,
    color: colors.textMuted,
  },
  summaryPaidAt: {
    ...typography.small,
    color: '#2D7A45',
  },

  // --- Note client ---------------------------------------------------------
  noteBox: {
    backgroundColor: '#FDF8EE',
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing.xs,
  },
  noteLabel: {
    ...typography.small,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noteText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // --- Section card --------------------------------------------------------
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

  // --- Detail / contact rows -----------------------------------------------
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contactRowPressed: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
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
  linkText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // --- Items ---------------------------------------------------------------
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemMain: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  itemVariantCode: {
    ...typography.small,
    color: colors.textMuted,
  },
  itemUnitPrice: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemLineTotal: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingTop: 2,
  },

  // --- Grand total ---------------------------------------------------------
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.3,
  },

  // --- Info / error --------------------------------------------------------
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

  // --- Actions statut ------------------------------------------------------
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  actionsCardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  actionsUpdating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionsUpdatingText: {
    ...typography.small,
    color: colors.textMuted,
  },
  actionsErrorText: {
    ...typography.small,
    color: '#8A2A1B',
  },
  actionsEmptyText: {
    ...typography.small,
    color: colors.textMuted,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  actionButtonDanger: {
    borderColor: '#C0392B',
  },
  actionButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: '#C0392B',
  },
});
