import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchDashboardSummary } from '../../src/companies/companiesApi';
import type {
  DashboardEvent,
  DashboardSummary,
  DashboardSupportRequest,
} from '../../src/companies/companiesTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Label helpers -------------------------------------------------------

function labelForEventType(type: string): string {
  switch (type) {
    case 'order_received':
      return 'Commande reçue';
    case 'maintenance_done':
      return 'Maintenance effectuée';
    case 'payment_received':
      return 'Paiement reçu';
    case 'support_created':
      return 'Ticket support';
    case 'project_updated':
      return 'Projet mis à jour';
    case 'contact_request':
      return 'Demande de contact';
    default:
      return type;
  }
}

function labelForSeverity(severity: string): string {
  switch (severity) {
    case 'success':
      return 'Succès';
    case 'info':
      return 'Info';
    case 'warning':
      return 'Attention';
    case 'error':
      return 'Erreur';
    default:
      return severity;
  }
}

function colorForSeverity(severity: string): string {
  switch (severity) {
    case 'success':
      return colors.primary;
    case 'info':
      return colors.textSecondary;
    case 'warning':
      return '#B97A2A';
    case 'error':
      return '#8A2A1B';
    default:
      return colors.textMuted;
  }
}

function labelForSupportType(type: string): string {
  switch (type) {
    case 'technical':
      return 'Technique';
    case 'modification':
      return 'Modification';
    case 'billing':
      return 'Facturation';
    case 'other':
      return 'Autre';
    default:
      return type;
  }
}

function labelForPriority(priority: string): string {
  switch (priority) {
    case 'low':
      return 'Basse';
    case 'normal':
      return 'Normale';
    case 'high':
      return 'Haute';
    case 'urgent':
      return 'Urgente';
    default:
      return priority;
  }
}

function colorForPriority(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '#8A2A1B';
    case 'high':
      return '#B97A2A';
    case 'normal':
      return colors.textSecondary;
    case 'low':
      return colors.textMuted;
    default:
      return colors.textMuted;
  }
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Ouvert';
    case 'in_progress':
      return 'En cours';
    case 'resolved':
      return 'Résolu';
    case 'closed':
      return 'Fermé';
    default:
      return status;
  }
}

function colorForStatus(status: string): string {
  switch (status) {
    case 'open':
      return colors.primary;
    case 'in_progress':
      return '#B97A2A';
    case 'resolved':
      return colors.textMuted;
    case 'closed':
      return colors.border;
    default:
      return colors.textMuted;
  }
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

// --- Screen state --------------------------------------------------------

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: DashboardSummary };

// --- Sub-components ------------------------------------------------------

function StatCard({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

function EventRow({ event }: { event: DashboardEvent }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listItemMain}>
        <Text style={styles.listItemTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.listItemMeta}>
          <Text style={styles.listItemType}>
            {labelForEventType(event.type)}
          </Text>
          <Text style={styles.metaDot}> · </Text>
          <Text
            style={[
              styles.listItemBadge,
              { color: colorForSeverity(event.severity) },
            ]}
          >
            {labelForSeverity(event.severity)}
          </Text>
        </View>
      </View>
      <Text style={styles.listItemDate}>{formatDate(event.createdAt)}</Text>
    </View>
  );
}

function SupportRow({ ticket }: { ticket: DashboardSupportRequest }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listItemMain}>
        <Text style={styles.listItemTitle} numberOfLines={1}>
          {ticket.title}
        </Text>
        <View style={styles.listItemMeta}>
          <Text style={styles.listItemType}>
            {labelForSupportType(ticket.type)}
          </Text>
          <Text style={styles.metaDot}> · </Text>
          <Text
            style={[
              styles.listItemBadge,
              { color: colorForPriority(ticket.priority) },
            ]}
          >
            {labelForPriority(ticket.priority)}
          </Text>
          <Text style={styles.metaDot}> · </Text>
          <Text
            style={[
              styles.listItemBadge,
              styles.listItemBadgeBold,
              { color: colorForStatus(ticket.status) },
            ]}
          >
            {labelForStatus(ticket.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.listItemDate}>{formatDate(ticket.createdAt)}</Text>
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function HomeScreen() {
  const { authenticatedRequest } = useAuth();
  const {
    selectedCompany,
    isLoadingCompanies,
    companyError,
    refreshCompanies,
  } = useCompany();
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });

  // Tracks whether the initial load has already been triggered by useEffect,
  // so useFocusEffect can skip it on first mount and only run on return focus.
  const hasMountedRef = useRef(false);

  // Full load — shows spinner, used on first mount + selectedCompany changes + error retry.
  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setState({ kind: 'loading' });
    try {
      const res = await fetchDashboardSummary(
        selectedCompany.id,
        authenticatedRequest,
      );
      setState({ kind: 'ready', data: res.summary });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setState({ kind: 'error', message });
    }
  }, [selectedCompany, authenticatedRequest]);

  // Silent refresh — keeps existing data visible while fetching updated data.
  // Called on return focus. Fails silently to avoid disrupting the user.
  const silentRefresh = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const res = await fetchDashboardSummary(
        selectedCompany.id,
        authenticatedRequest,
      );
      setState({ kind: 'ready', data: res.summary });
    } catch {
      // Intentionally ignored — existing data stays visible.
    }
  }, [selectedCompany, authenticatedRequest]);

  // Initial load + refresh when selectedCompany changes.
  useEffect(() => {
    load();
  }, [load]);

  // On every return to this tab (not the initial mount): silent data refresh.
  // useFocusEffect fires on mount AND on re-focus, so we skip the first fire
  // to avoid a double fetch with the useEffect above.
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      silentRefresh();
    }, [silentRefresh]),
  );

  return (
    <AppScreen>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACCUEIL</Text>
        <Text style={styles.title}>Vue d&apos;ensemble</Text>
      </View>

      {/* ── Global states (company) ───────────────────────── */}

      {isLoadingCompanies && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {companyError && (
        <View style={styles.section}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              Impossible de charger les entreprises
            </Text>
            <Text style={styles.errorMessage}>{companyError}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={refreshCompanies}
          >
            <Text style={styles.retryLabel}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {!isLoadingCompanies && !companyError && !selectedCompany && (
        <View style={styles.section}>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Aucune entreprise active associée à votre compte.
            </Text>
          </View>
        </View>
      )}

      {/* ── Local states (dashboard data) ─────────────────── */}

      {!isLoadingCompanies && !companyError && selectedCompany && (
        <>
          {/* Company label */}
          <Text style={styles.companyLabel}>
            {selectedCompany.name.toUpperCase()}
          </Text>

          {/* Dashboard loading */}
          {state.kind === 'loading' && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {/* Dashboard error */}
          {state.kind === 'error' && (
            <View style={styles.section}>
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  Impossible de charger le tableau de bord
                </Text>
                <Text style={styles.errorMessage}>{state.message}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.retryButtonPressed,
                ]}
                onPress={load}
              >
                <Text style={styles.retryLabel}>Réessayer</Text>
              </Pressable>
            </View>
          )}

          {/* Dashboard ready */}
          {state.kind === 'ready' && (
            <>
              {/* Stat grid */}
              <View style={styles.statGrid}>
                <StatCard
                  value={state.data.counts.projects}
                  label="Projets"
                />
                <StatCard
                  value={state.data.counts.activeProjects}
                  label="Projets actifs"
                  accent
                />
                <StatCard
                  value={state.data.counts.openSupportRequests}
                  label="Support ouvert"
                />
                <StatCard
                  value={state.data.counts.eventsLast7Days}
                  label="Activités / 7j"
                />
              </View>

              {/* Latest events */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dernières activités</Text>

                {state.data.latestEvents.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      Aucune activité récente.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.listCard}>
                    {state.data.latestEvents.map((event, idx) => (
                      <View key={event.id}>
                        <EventRow event={event} />
                        {idx < state.data.latestEvents.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Latest support requests */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Support récent</Text>

                {state.data.latestSupportRequests.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      Aucune demande support récente.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.listCard}>
                    {state.data.latestSupportRequests.map((ticket, idx) => (
                      <View key={ticket.id}>
                        <SupportRow ticket={ticket} />
                        {idx <
                          state.data.latestSupportRequests.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </>
      )}
    </AppScreen>
  );
}

// --- Styles --------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
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
  companyLabel: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },

  // ── Stat grid ────────────────────────────────────────
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    // Two cards per row, accounting for the gap between them.
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  statCardAccent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  statValueAccent: {
    color: '#FFFFFF',
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  statLabelAccent: {
    color: 'rgba(255,255,255,0.75)',
  },

  // ── List card (events + support) ─────────────────────
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  listItemMain: {
    gap: spacing.xs,
  },
  listItemTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  listItemType: {
    ...typography.small,
    color: colors.textMuted,
  },
  metaDot: {
    ...typography.small,
    color: colors.textMuted,
  },
  listItemBadge: {
    ...typography.small,
  },
  listItemBadgeBold: {
    fontWeight: '600',
  },
  listItemDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  // ── Error state ──────────────────────────────────────
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

  // ── Empty state ──────────────────────────────────────
  emptyBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
