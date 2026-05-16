import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import type { CompanyAccess } from '../../src/auth/authTypes';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchEvents } from '../../src/companies/companiesApi';
import type { CompanyEvent } from '../../src/companies/companiesTypes';
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
  | { kind: 'no_company' }
  | { kind: 'ready'; company: CompanyAccess; events: CompanyEvent[] };

// --- Sub-components ------------------------------------------------------

function EventCard({ event }: { event: CompanyEvent }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{event.title}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.cardType}>{labelForEventType(event.type)}</Text>
        <Text style={styles.cardDot}> · </Text>
        <Text
          style={[
            styles.cardSeverity,
            { color: colorForSeverity(event.severity) },
          ]}
        >
          {labelForSeverity(event.severity)}
        </Text>
      </View>

      {event.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}

      <Text style={styles.cardDate}>{formatDate(event.createdAt)}</Text>
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function ActivityScreen() {
  const { authenticatedRequest } = useAuth();
  const { selectedCompany, isLoadingCompanies, companyError, refreshCompanies } = useCompany();
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setState({ kind: 'loading' });
    try {
      const data = await fetchEvents(selectedCompany.id, authenticatedRequest, 20);
      setState({ kind: 'ready', company: selectedCompany, events: data.events });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setState({ kind: 'error', message });
    }
  }, [selectedCompany, authenticatedRequest]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACTIVITÉ</Text>
        <Text style={styles.title}>Fil d&apos;activité</Text>
      </View>

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

      {!isLoadingCompanies && !companyError && selectedCompany && (
        <>
          {state.kind === 'loading' && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {state.kind === 'error' && (
            <View style={styles.section}>
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  Impossible de charger l&apos;activité
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

          {state.kind === 'ready' && (
            <View style={styles.section}>
              <Text style={styles.companyLabel}>
                {state.company.name.toUpperCase()}
              </Text>

              {state.events.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    Aucune activité pour le moment.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {state.events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>
              )}
            </View>
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
  section: {
    gap: spacing.md,
  },
  companyLabel: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  // Event card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardType: {
    ...typography.small,
    color: colors.textMuted,
  },
  cardDot: {
    ...typography.small,
    color: colors.textMuted,
  },
  cardSeverity: {
    ...typography.small,
    fontWeight: '500',
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Error state
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
  // Empty state
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
