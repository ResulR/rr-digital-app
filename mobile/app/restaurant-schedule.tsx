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
import { useAuth } from '../src/auth/AuthContext';
import { useCompany } from '../src/companies/CompanyContext';
import { fetchRestaurantSchedule } from '../src/restaurant/restaurantApi';
import type {
  ExceptionalClosure,
  OpeningHour,
  RestaurantScheduleData,
  ScheduleOverride,
  StoreAvailability,
  StoreStatus,
} from '../src/restaurant/restaurantTypes';
import { AppScreen } from '../src/components/AppScreen';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';

const MODULE_KEY = 'restaurant_schedule';

// --- Helpers -----------------------------------------------------------------

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

// --- Sub-components ----------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatusRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function AvailabilityCard({ availability }: { availability: StoreAvailability }) {
  const color = availability.isOpen ? COLOR_OPEN : COLOR_CLOSED;
  return (
    <SectionCard title="Statut">
      <StatusRow
        label="Restaurant"
        value={availability.isOpen ? 'Ouvert' : 'Ferme'}
        valueColor={color}
      />
      {!availability.isOpen && availability.message ? (
        <Text style={styles.noteText}>{availability.message}</Text>
      ) : null}
    </SectionCard>
  );
}

function StoreStatusCard({ status }: { status: StoreStatus }) {
  return (
    <>
      <SectionCard title="Commandes">
        <StatusRow
          label="Commandes en ligne"
          value={status.ordersEnabled ? 'Activees' : 'Desactivees'}
          valueColor={status.ordersEnabled ? COLOR_OPEN : COLOR_CLOSED}
        />
        {!status.ordersEnabled && status.ordersDisabledReason ? (
          <Text style={styles.noteText}>{status.ordersDisabledReason}</Text>
        ) : null}
      </SectionCard>

      <SectionCard title="Services">
        <StatusRow
          label="Livraison"
          value={status.deliveryEnabled ? 'Active' : 'Desactivee'}
          valueColor={status.deliveryEnabled ? COLOR_OPEN : COLOR_MUTED}
        />
        <StatusRow
          label="Retrait"
          value={status.pickupEnabled ? 'Actif' : 'Desactive'}
          valueColor={status.pickupEnabled ? COLOR_OPEN : COLOR_MUTED}
        />
        <StatusRow
          label="Mode rush"
          value={status.rushModeEnabled ? 'Actif' : 'Desactive'}
          valueColor={status.rushModeEnabled ? COLOR_WARN : COLOR_MUTED}
        />
      </SectionCard>
    </>
  );
}

function OpeningHoursCard({ hours }: { hours: OpeningHour[] }) {
  return (
    <SectionCard title="Horaires semaine">
      {hours.map((h) => (
        <View key={h.dayKey} style={styles.hourRow}>
          <Text style={styles.hourDay}>{DAY_LABELS[h.dayKey] ?? h.dayKey}</Text>
          {h.isOpen ? (
            <Text style={styles.hourTime}>
              {h.openTime} - {h.closeTime}
            </Text>
          ) : (
            <Text style={[styles.hourTime, { color: COLOR_CLOSED }]}>Ferme</Text>
          )}
        </View>
      ))}
    </SectionCard>
  );
}

function ClosuresCard({ closures }: { closures: ExceptionalClosure[] }) {
  return (
    <SectionCard title="Fermetures exceptionnelles">
      {closures.length === 0 ? (
        <Text style={styles.emptyText}>Aucune fermeture exceptionnelle.</Text>
      ) : (
        closures.map((c) => (
          <View key={c.id} style={styles.overrideRow}>
            <Text style={styles.overrideDate}>
              {formatDate(c.startsAt)} - {formatDate(c.endsAt)}
            </Text>
            {c.reason ? <Text style={styles.noteText}>{c.reason}</Text> : null}
          </View>
        ))
      )}
    </SectionCard>
  );
}

function OverridesCard({ overrides }: { overrides: ScheduleOverride[] }) {
  return (
    <SectionCard title="Horaires speciaux">
      {overrides.length === 0 ? (
        <Text style={styles.emptyText}>Aucun horaire special.</Text>
      ) : (
        overrides.map((o) => (
          <View key={o.id} style={styles.overrideRow}>
            <Text style={styles.overrideDate}>{formatDate(o.serviceDate)}</Text>
            {o.isClosed ? (
              <Text style={[styles.noteText, { color: COLOR_CLOSED }]}>Ferme</Text>
            ) : (
              <Text style={styles.noteText}>
                {o.openTime ?? '--'} - {o.closeTime ?? '--'}
                {o.note ? `  (${o.note})` : ''}
              </Text>
            )}
          </View>
        ))
      )}
    </SectionCard>
  );
}

// --- Screen ------------------------------------------------------------------

export default function RestaurantScheduleScreen() {
  const { authenticatedRequest } = useAuth();
  const { selectedCompany } = useCompany();

  const [schedule, setSchedule] = useState<RestaurantScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasModule = selectedCompany?.modules.includes(MODULE_KEY) ?? false;

  const loadSchedule = useCallback(
    async (silent = false) => {
      if (!selectedCompany || !hasModule) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRestaurantSchedule(
          selectedCompany.id,
          authenticatedRequest,
        );
        setSchedule(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger les horaires.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCompany, hasModule, authenticatedRequest],
  );

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSchedule(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSchedule]);

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
        <Text style={styles.title}>Horaires restaurant</Text>
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

      {/* Content */}
      {hasModule && selectedCompany && (
        <View style={styles.content}>
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
                  Impossible de charger les horaires.
                </Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.retryButtonPressed,
                ]}
                onPress={() => loadSchedule()}
              >
                <Text style={styles.retryLabel}>Reessayer</Text>
              </Pressable>
            </View>
          )}

          {/* Data */}
          {!isLoading && !error && schedule && (
            <View style={styles.section}>
              <AvailabilityCard availability={schedule.storeAvailability} />
              <StoreStatusCard status={schedule.storeStatus} />
              <OpeningHoursCard hours={schedule.openingHours} />
              <ClosuresCard closures={schedule.closures} />
              <OverridesCard overrides={schedule.overrides} />
            </View>
          )}
        </View>
      )}
    </AppScreen>
  );
}

// --- Constants ---------------------------------------------------------------

const COLOR_OPEN = '#2D7A45';
const COLOR_CLOSED = '#C0392B';
const COLOR_MUTED = colors.textMuted;
const COLOR_WARN = '#B7700A';

// --- Styles ------------------------------------------------------------------

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
  content: {
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  section: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noteText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hourDay: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  hourTime: {
    ...typography.body,
    color: colors.textSecondary,
  },
  overrideRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  overrideDate: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
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
