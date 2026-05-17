import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchRestaurantOrders } from '../../src/restaurant/restaurantApi';
import type { FetchOrdersParams } from '../../src/restaurant/restaurantApi';
import type { RestaurantOrder } from '../../src/restaurant/restaurantTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const MODULE_KEY = 'restaurant_orders';

// --- Filters ---------------------------------------------------------------

type FilterKey =
  | 'today'
  | 'recent'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'completed'
  | 'cancelled';

interface FilterConfig {
  key: FilterKey;
  label: string;
  params: FetchOrdersParams;
  emptyText: string;
}

const FILTERS: FilterConfig[] = [
  {
    key: 'today',
    label: "Aujourd'hui",
    params: { date: 'today', limit: 50 },
    emptyText: "Aucune commande trouvee aujourd'hui.",
  },
  {
    key: 'recent',
    label: 'Toutes recentes',
    params: { limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
  {
    key: 'preparing',
    label: 'En preparation',
    params: { status: 'preparing', limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
  {
    key: 'ready',
    label: 'Pretes',
    params: { status: 'ready', limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
  {
    key: 'in_delivery',
    label: 'En livraison',
    params: { status: 'in_delivery', limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
  {
    key: 'completed',
    label: 'Terminees',
    params: { status: 'completed', limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
  {
    key: 'cancelled',
    label: 'Annulees',
    params: { status: 'cancelled', limit: 50 },
    emptyText: 'Aucune commande pour ce filtre.',
  },
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

// --- Sub-components --------------------------------------------------------

function FilterChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        isActive ? styles.filterChipActive : null,
        pressed && !isActive ? styles.filterChipPressed : null,
      ]}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function OrderCard({ order }: { order: RestaurantOrder }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}
      // Typed routes: using `as never` because .expo/types/router.d.ts is
      // auto-generated; the route is declared there but the string template
      // literal form isn't always inferred correctly at typecheck time.
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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('today');

  const hasModule = selectedCompany?.modules.includes(MODULE_KEY) ?? false;

  // Stable reference: FILTERS is a module-level const, .find returns the same
  // object reference for the same key, so this only changes when activeFilter changes.
  const filterConfig = FILTERS.find((f) => f.key === activeFilter) ?? FILTERS[0];

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!selectedCompany || !hasModule) return;
      if (!silent) {
        setIsLoading(true);
        setOrders([]); // clear stale results immediately when filter changes
      }
      setError(null);
      try {
        const result = await fetchRestaurantOrders(
          selectedCompany.id,
          authenticatedRequest,
          filterConfig.params,
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
    [selectedCompany, hasModule, authenticatedRequest, filterConfig],
  );

  // Reload whenever the filter or company changes.
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

  const handleFilterChange = useCallback((key: FilterKey) => {
    setActiveFilter(key);
    // loadOrders will fire via useEffect because filterConfig changes.
  }, []);

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
        <View style={styles.headerMeta}>
          {selectedCompany ? (
            <Text style={styles.companyLabel}>{selectedCompany.name.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.readonlyLabel}>Lecture seule</Text>
        </View>
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

      {/* Filters + content (shown when module is enabled and company is selected) */}
      {hasModule && selectedCompany && (
        <View style={styles.mainContent}>
          {/* Filter chips row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
            style={styles.filtersScroll}
          >
            {FILTERS.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                isActive={activeFilter === filter.key}
                onPress={() => handleFilterChange(filter.key)}
              />
            ))}
          </ScrollView>

          {/* Loading */}
          {isLoading && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {/* Error */}
          {!isLoading && error && (
            <View style={styles.section}>
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  Impossible de charger les commandes.
                </Text>
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
          {!isLoading && !error && orders.length === 0 && (
            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{filterConfig.emptyText}</Text>
              </View>
            </View>
          )}

          {/* Order list */}
          {!isLoading && !error && orders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {orders.length}{' '}
                {orders.length > 1 ? 'commandes' : 'commande'}
              </Text>
              <View style={styles.orderList}>
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </View>
            </View>
          )}
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  companyLabel: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  readonlyLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  mainContent: {
    gap: spacing.md,
  },
  filtersScroll: {
    marginHorizontal: -spacing.xl, // bleed to screen edges
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipPressed: {
    backgroundColor: colors.border,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  centered: {
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
