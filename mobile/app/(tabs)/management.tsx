import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useCompany } from '../../src/companies/CompanyContext';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Module helpers -------------------------------------------------------

// Module keys that have a live screen in this app version.
const AVAILABLE_MODULES = new Set(['restaurant_orders', 'restaurant_schedule']);

// Returns a navigation callback for modules that have a live screen,
// or undefined for modules that are not yet implemented.
function onPressForModule(key: string): (() => void) | undefined {
  switch (key) {
    case 'restaurant_orders':
      // Typed routes: .expo/types/router.d.ts is auto-generated and does not
      // yet include this route. Using `as never` to avoid touching the generated file.
      return () => router.push('/restaurant-orders' as never);
    case 'restaurant_schedule':
      return () => router.push('/restaurant-schedule' as never);
    default:
      return undefined;
  }
}

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

function ModuleCard({
  moduleKey,
  onPress,
}: {
  moduleKey: string;
  onPress?: () => void;
}) {
  const info = infoForModule(moduleKey);
  const isAvailable = AVAILABLE_MODULES.has(moduleKey);

  const inner = (
    <View style={[styles.moduleCard, isAvailable && styles.moduleCardAvailable]}>
      <View style={styles.moduleCardTop}>
        <Text style={styles.moduleCardTitle}>{info.title}</Text>
        <View
          style={[
            styles.moduleBadge,
            isAvailable ? styles.moduleBadgeAvailable : styles.moduleBadgeSoon,
          ]}
        >
          <Text
            style={[
              styles.moduleBadgeText,
              isAvailable && styles.moduleBadgeTextAvailable,
            ]}
          >
            {isAvailable ? 'Disponible' : 'Bientot disponible'}
          </Text>
        </View>
      </View>
      <Text style={styles.moduleCardDescription}>{info.description}</Text>
      {isAvailable && (
        <Text style={styles.moduleCardCta}>Ouvrir le module</Text>
      )}
    </View>
  );

  if (isAvailable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.moduleCardTouchPressed : undefined)}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
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
                <ModuleCard
                  key={key}
                  moduleKey={key}
                  onPress={onPressForModule(key)}
                />
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
  moduleCardAvailable: {
    borderColor: colors.primary,
  },
  moduleCardTouchPressed: {
    opacity: 0.75,
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
  moduleCardCta: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  moduleBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moduleBadgeSoon: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
  },
  moduleBadgeAvailable: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moduleBadgeText: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  moduleBadgeTextAvailable: {
    color: colors.surface,
    fontWeight: '600',
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
