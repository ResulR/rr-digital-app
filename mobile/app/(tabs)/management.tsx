import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCompany } from '../../src/companies/CompanyContext';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Module helpers -------------------------------------------------------

interface ModuleInfo {
  title: string;
  description: string;
}

function infoForModule(key: string): ModuleInfo {
  switch (key) {
    case 'project_metrics':
      return {
        title: 'Statistiques projet',
        description: 'Suivez les indicateurs importants de votre projet.',
      };
    case 'restaurant_orders':
      return {
        title: 'Commandes restaurant',
        description: 'Consultez les commandes recues depuis votre site.',
      };
    case 'restaurant_schedule':
      return {
        title: 'Horaires restaurant',
        description: 'Consultez et preparez la gestion des horaires.',
      };
    case 'contact_requests':
      return {
        title: 'Demandes de contact',
        description: 'Suivez les demandes envoyees depuis votre site.',
      };
    case 'ecommerce_orders':
      return {
        title: 'Commandes e-commerce',
        description: 'Suivez les commandes de votre boutique.',
      };
    case 'ecommerce_products':
      return {
        title: 'Produits e-commerce',
        description: 'Gardez un oeil sur les produits importants.',
      };
    case 'notifications':
      return {
        title: 'Notifications',
        description: 'Retrouvez les alertes importantes.',
      };
    default:
      return {
        title: key,
        description: 'Module configure pour cette entreprise.',
      };
  }
}

// --- Sub-components ------------------------------------------------------

function ModuleCard({ moduleKey }: { moduleKey: string }) {
  const info = infoForModule(moduleKey);
  return (
    <View style={styles.moduleCard}>
      <View style={styles.moduleCardTop}>
        <Text style={styles.moduleCardTitle}>{info.title}</Text>
        <View style={styles.moduleBadge}>
          <Text style={styles.moduleBadgeText}>Bientot disponible</Text>
        </View>
      </View>
      <Text style={styles.moduleCardDescription}>{info.description}</Text>
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function ManagementScreen() {
  const {
    selectedCompany,
    isLoadingCompanies,
    companyError,
    refreshCompanies,
  } = useCompany();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCompanies();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCompanies]);

  const modules = selectedCompany?.modules ?? [];

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
        <Text style={styles.eyebrow}>GESTION</Text>
        <Text style={styles.title}>Espace entreprise</Text>
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
            <Text style={styles.retryLabel}>Reessayer</Text>
          </Pressable>
        </View>
      )}

      {!isLoadingCompanies && !companyError && !selectedCompany && (
        <View style={styles.section}>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Aucune entreprise active associee a votre compte.
            </Text>
          </View>
        </View>
      )}

      {!isLoadingCompanies && !companyError && selectedCompany && (
        <View style={styles.section}>
          <Text style={styles.companyLabel}>
            {selectedCompany.name.toUpperCase()}
          </Text>

          <Text style={styles.sectionTitle}>Modules</Text>

          {modules.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucun module actif pour cette entreprise.
              </Text>
            </View>
          ) : (
            <View style={styles.moduleList}>
              {modules.map((key) => (
                <ModuleCard key={key} moduleKey={key} />
              ))}
            </View>
          )}
        </View>
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
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.md,
  },
  moduleList: {
    gap: spacing.md,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  moduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  moduleCardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  moduleCardDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },
  moduleBadge: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  moduleBadgeText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
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
