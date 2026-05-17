import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import type { CompanyAccess } from '../../src/auth/authTypes';
import { useCompany } from '../../src/companies/CompanyContext';
import { fetchProjects } from '../../src/companies/companiesApi';
import type { Project } from '../../src/companies/companiesTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Label helpers -------------------------------------------------------

function labelForType(type: string): string {
  switch (type) {
    case 'website':
      return 'Site web';
    case 'ecommerce':
      return 'E-commerce';
    case 'mobile_app':
      return 'Application mobile';
    case 'dashboard':
      return 'Dashboard';
    case 'automation':
      return 'Automatisation';
    case 'ai':
      return 'Intelligence artificielle';
    case 'custom':
      return 'Personnalisé';
    default:
      return type;
  }
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'maintenance':
      return 'Maintenance';
    case 'draft':
      return 'Brouillon';
    case 'archived':
      return 'Archivé';
    default:
      return status;
  }
}

function colorForStatus(status: string): string {
  switch (status) {
    case 'active':
      return colors.primary;
    case 'maintenance':
      return '#B97A2A';
    case 'draft':
      return colors.textMuted;
    case 'archived':
      return colors.border;
    default:
      return colors.textMuted;
  }
}

// --- Screen state --------------------------------------------------------

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'no_company' }
  | { kind: 'ready'; company: CompanyAccess; projects: Project[] };

// --- Sub-components ------------------------------------------------------

function ProjectCard({ project }: { project: Project }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{project.name}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.cardType}>{labelForType(project.type)}</Text>
        <Text style={styles.cardDot}> · </Text>
        <Text
          style={[styles.cardStatus, { color: colorForStatus(project.status) }]}
        >
          {labelForStatus(project.status)}
        </Text>
      </View>

      {project.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {project.description}
        </Text>
      ) : null}

      {project.url ? (
        <Text style={styles.cardUrl} numberOfLines={1}>
          {project.url}
        </Text>
      ) : null}
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function ProjectsScreen() {
  const { authenticatedRequest } = useAuth();
  const { selectedCompany, isLoadingCompanies, companyError, refreshCompanies } = useCompany();
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setState({ kind: 'loading' });
    try {
      const data = await fetchProjects(selectedCompany.id, authenticatedRequest);
      setState({ kind: 'ready', company: selectedCompany, projects: data.projects });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setState({ kind: 'error', message });
    }
  }, [selectedCompany, authenticatedRequest]);

  // Pull-to-refresh — fetches without resetting state to loading.
  const onRefresh = useCallback(async () => {
    if (!selectedCompany) return;
    setIsRefreshing(true);
    try {
      const data = await fetchProjects(selectedCompany.id, authenticatedRequest);
      setState({ kind: 'ready', company: selectedCompany, projects: data.projects });
    } catch {
      // Silent fail — existing data stays visible.
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCompany, authenticatedRequest]);

  useEffect(() => {
    load();
  }, [load]);

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROJETS</Text>
        <Text style={styles.title}>Vos projets</Text>
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
                <Text style={styles.errorTitle}>Impossible de charger les projets</Text>
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

              {state.projects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    Aucun projet pour le moment.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {state.projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
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
  // Project card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardName: {
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
  cardStatus: {
    ...typography.small,
    fontWeight: '500',
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardUrl: {
    ...typography.small,
    color: colors.accent,
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
