import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchRestaurantOrders } from '../../src/restaurant/restaurantApi';
import type { RestaurantOrder } from '../../src/restaurant/restaurantTypes';
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

// --- Sub-components --------------------------------------------------------

function OrderCard({ order }: { order: RestaurantOrder }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}
      // Typed routes: using `as never` because .expo/types/router.d.ts is
      // auto-generated and does not yet include this dynamic route.
      onPress={() => router.push(`/restaurant-orders/${order.id}` as never)}
    >
      <View style={styles.orderCardTop}>
        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { borderColor: colorForStatus(order.status) }]}>
          <Text style={[styles.statusBadgeText, { color: colorForStatus(order.status) }]}>
            {labelForStatus(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardMeta}>
        <Text style={styles.metaText}>{labelForFulfillment(order.fulfillmentMethod)}</Text>
        {order.customerName ? (
          <Text style={styles.metaText}>{order.customerName}</Text>
        ) : null}
      </View>

      <View style={styles.orderCardBottom}>
        <Text style={styles.orderTotal}>{formatCents(order.totalCents)}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

// --- Screen ----------------------------------------------------------------

export default function RestaurantOrdersScreen() {
  const { authenticatedRequest } = useAuth();
  const { selectedCompany } = useCompany();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasModule = selectedCompany?.modules.includes(MODULE_KEY) ?? false;

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!selectedCompany || !hasModule) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const result = await fetchRestaurantOrders(
          selectedCompany.id,
          authenticatedRequest,
          { date: 'today', limit: 50 },
        );
        setOrders(result.orders);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Impossible de charger les commandes.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCompany, hasModule, authenticatedRequest],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadOrders(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOrders]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          hitSlop={12}
        >
          <Text style={styles.backButtonText}>{'< Retour'}</Text>
        </Pressable>
        <Text style={styles.eyebrow}>GESTION</Text>
        <Text style={styles.title}>Commandes restaurant</Text>
        {selectedCompany ? (
          <Text style={styles.companyLabel}>{selectedCompany.name.toUpperCase()}</Text>
        ) : null}
      </View>

      {/* Module not enabled */}
      {!hasModule && (
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Module non disponible pour cette entreprise.
            </Text>
          </View>
        </View>
      )}

      {/* No company selected */}
      {hasModule && !selectedCompany && (
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Aucune entreprise selectionnee.</Text>
          </View>
        </View>
      )}

      {/* Loading */}
      {hasModule && selectedCompany && isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {/* Error */}
      {hasModule && selectedCompany && !isLoading && error && (
        <View style={styles.section}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Impossible de charger les commandes.</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={() => loadOrders()}
          >
            <Text style={styles.retryLabel}>Reessayer</Text>
          </Pressable>
        </View>
      )}

      {/* Empty */}
      {hasModule && selectedCompany && !isLoading && !error && orders.length === 0 && (
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Aucune commande trouvee.</Text>
          </View>
        </View>
      )}

      {/* Order list */}
      {hasModule && selectedCompany && !isLoading && !error && orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {orders.length}{' '}
            {orders.length > 1 ? 'commandes' : 'commande'}{' '}
            {"aujourd'hui"}
          </Text>
          <View style={styles.orderList}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
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
  companyLabel: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  orderList: {
    gap: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  orderCardPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  orderNumber: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
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
  orderCardMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderDate: {
    ...typography.small,
    color: colors.textMuted,
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
