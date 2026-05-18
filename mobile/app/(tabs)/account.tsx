import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import type { CompanyAccess, MeResponse } from '../../src/auth/authTypes';
import { useCompany } from '../../src/companies/CompanyContext';
import { AppCard } from '../../src/components/AppCard';
import { AppScreen } from '../../src/components/AppScreen';
import { apiRequest, ApiError } from '../../src/lib/apiClient';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Label helpers -------------------------------------------------------

function labelForRole(role: string): string {
  switch (role) {
    case 'superadmin':
      return 'Administrateur RR Digital';
    case 'user':
      return 'Utilisateur';
    default:
      return role;
  }
}

function labelForCompanyRole(role: string): string {
  switch (role) {
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'user':
      return 'Membre';
    default:
      return role;
  }
}

function labelForCompanyStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'inactive':
      return 'Inactif';
    case 'suspended':
      return 'Suspendu';
    default:
      return status;
  }
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('');
}

// --- Diagnostic state types ----------------------------------------------

type HealthResult =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; service: string; timestamp: string }
  | { kind: 'error'; message: string };

type SessionResult =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; fullName: string; email: string; role: string }
  | { kind: 'error'; message: string };

interface HealthPayload {
  status: string;
  service: string;
  timestamp: string;
}

// --- Sub-components ------------------------------------------------------

function CompanyCard({
  company,
  isSelected,
  onSelect,
}: {
  company: CompanyAccess;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <View style={[styles.companyCard, isSelected && styles.companyCardSelected]}>
      <View style={styles.companyCardTop}>
        <Text style={styles.companyCardName}>{company.name}</Text>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>Sélectionnée</Text>
          </View>
        )}
      </View>

      <Text style={styles.companyCardDetail}>
        Statut: {labelForCompanyStatus(company.status)}
      </Text>
      <Text style={styles.companyCardDetail}>
        Role: {labelForCompanyRole(company.role)}
      </Text>

      {!isSelected && company.status === 'active' && (
        <Pressable
          style={({ pressed }) => [
            styles.useButton,
            pressed && styles.useButtonPressed,
          ]}
          onPress={onSelect}
        >
          <Text style={styles.useButtonLabel}>Utiliser cette entreprise</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout, authenticatedRequest } = useAuth();
  const {
    companies,
    selectedCompany,
    isLoadingCompanies,
    companyError,
    refreshCompanies,
    selectCompany,
  } = useCompany();

  const [healthResult, setHealthResult] = useState<HealthResult>({
    kind: 'idle',
  });
  const [sessionResult, setSessionResult] = useState<SessionResult>({
    kind: 'idle',
  });
  const [loggingOut, setLoggingOut] = useState(false);

  // Unchanged: test public /health endpoint.
  const handleTest = async () => {
    setHealthResult({ kind: 'loading' });
    try {
      const data = await apiRequest<HealthPayload>('/health');
      setHealthResult({
        kind: 'ok',
        service: data.service,
        timestamp: data.timestamp,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setHealthResult({ kind: 'error', message });
    }
  };

  // Unchanged: test authenticated session via /auth/me.
  const handleTestSession = async () => {
    setSessionResult({ kind: 'loading' });
    try {
      const data = await authenticatedRequest<MeResponse>('/auth/me');
      setSessionResult({
        kind: 'ok',
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.globalRole,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setSessionResult({ kind: 'error', message });
    }
  };

  // Unchanged: clear session locally + best-effort server-side revoke.
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      router.replace('/');
    }
  };

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMPTE</Text>
        <Text style={styles.title}>Mon espace</Text>
      </View>

      {/* Section 1 : Profil */}
      {user ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <AppCard>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(user.fullName)}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.fullName}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.profileTagRow}>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>
                      {labelForRole(user.globalRole)}
                    </Text>
                  </View>
                  <View style={styles.connectedTag}>
                    <Text style={styles.connectedTagText}>Connecté</Text>
                  </View>
                </View>
              </View>
            </View>
          </AppCard>
        </View>
      ) : null}

      {/* Section 2 : Entreprise utilisée */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entreprise utilisée</Text>

        {isLoadingCompanies && (
          <AppCard>
            <View style={styles.centeredRow}>
              <ActivityIndicator color={colors.primary} />
            </View>
          </AppCard>
        )}

        {!isLoadingCompanies && companyError ? (
          <>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{companyError}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.outlineButton,
                pressed && styles.outlineButtonPressed,
              ]}
              onPress={refreshCompanies}
            >
              <Text style={styles.outlineButtonLabel}>Réessayer</Text>
            </Pressable>
          </>
        ) : null}

        {!isLoadingCompanies && !companyError && !selectedCompany ? (
          <AppCard>
            <Text style={styles.emptyText}>
              Aucune entreprise associée à votre compte.
            </Text>
          </AppCard>
        ) : null}

        {!isLoadingCompanies && !companyError && selectedCompany ? (
          <AppCard>
            <View style={styles.companyCardTop}>
              <Text style={styles.companyCardName}>{selectedCompany.name}</Text>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Sélectionnée</Text>
              </View>
            </View>
            <Text style={styles.companyCardDetail}>
              Statut: {labelForCompanyStatus(selectedCompany.status)}
            </Text>
            <Text style={styles.companyCardDetail}>
              Role: {labelForCompanyRole(selectedCompany.role)}
            </Text>
          </AppCard>
        ) : null}
      </View>

      {/* Section 3 : Entreprises accessibles */}
      {!isLoadingCompanies && !companyError && companies.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entreprises accessibles</Text>
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSelected={selectedCompany?.id === company.id}
              onSelect={() => selectCompany(company.id)}
            />
          ))}
        </View>
      ) : null}

      {/* Section 4 : Diagnostic */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic</Text>

        {/* Session */}
        <AppCard>
          <Text style={styles.cardBody}>
            Verifie que la session est reconnue par le serveur.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.smallButton,
              pressed && styles.smallButtonPressed,
              sessionResult.kind === 'loading' && styles.buttonDisabled,
            ]}
            onPress={handleTestSession}
            disabled={sessionResult.kind === 'loading'}
          >
            {sessionResult.kind === 'loading' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.smallButtonLabel}>Tester la session</Text>
            )}
          </Pressable>

          {sessionResult.kind === 'ok' && (
            <View style={styles.statusOk}>
              <Text style={styles.statusOkTitle}>Session valide</Text>
              <Text style={styles.statusBody}>{sessionResult.fullName}</Text>
              <Text style={styles.statusBody}>{sessionResult.email}</Text>
              <Text style={styles.statusBody}>
                {labelForRole(sessionResult.role)}
              </Text>
            </View>
          )}

          {sessionResult.kind === 'error' && (
            <View style={styles.statusError}>
              <Text style={styles.statusErrorTitle}>Session invalide</Text>
              <Text style={styles.statusBody}>{sessionResult.message}</Text>
            </View>
          )}
        </AppCard>

        {/* API health */}
        <AppCard>
          <Text style={styles.cardBody}>
            Verifie la connexion avec le serveur RR Digital.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.smallButton,
              pressed && styles.smallButtonPressed,
              healthResult.kind === 'loading' && styles.buttonDisabled,
            ]}
            onPress={handleTest}
            disabled={healthResult.kind === 'loading'}
          >
            {healthResult.kind === 'loading' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.smallButtonLabel}>Tester l&apos;API</Text>
            )}
          </Pressable>

          {healthResult.kind === 'ok' && (
            <View style={styles.statusOk}>
              <Text style={styles.statusOkTitle}>API connectee</Text>
              <Text style={styles.statusBody}>
                Service: {healthResult.service}
              </Text>
              <Text style={styles.statusBody}>{healthResult.timestamp}</Text>
            </View>
          )}

          {healthResult.kind === 'error' && (
            <View style={styles.statusError}>
              <Text style={styles.statusErrorTitle}>API indisponible</Text>
              <Text style={styles.statusBody}>{healthResult.message}</Text>
            </View>
          )}
        </AppCard>
      </View>

      {/* Section 5 : Deconnexion */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
            loggingOut && styles.buttonDisabled,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

// --- Styles --------------------------------------------------------------

const styles = StyleSheet.create({
  // Layout
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
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  centeredRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Profile card
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  profileEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  profileTagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  roleTag: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  roleTagText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  connectedTag: {
    backgroundColor: '#EAF3EC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B3D4B8',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  connectedTagText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  // Company cards
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  companyCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  companyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  companyCardName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  selectedBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  companyCardDetail: {
    ...typography.small,
    color: colors.textSecondary,
  },
  useButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  useButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  useButtonLabel: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  // Diagnostic buttons
  smallButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  smallButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  smallButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Status boxes
  statusOk: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#EAF3EC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B3D4B8',
    gap: spacing.xs,
  },
  statusOkTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  statusError: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FBEEEC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6BFB7',
    gap: spacing.xs,
  },
  statusErrorTitle: {
    ...typography.sectionTitle,
    color: '#8A2A1B',
  },
  statusBody: {
    ...typography.small,
    color: colors.textSecondary,
  },
  // Error / empty states
  errorBox: {
    backgroundColor: '#FBEEEC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6BFB7',
    borderRadius: radius.md,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.small,
    color: '#8A2A1B',
  },
  outlineButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  outlineButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  outlineButtonLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Logout button
  logoutButton: {
    backgroundColor: '#8A2A1B',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: '#6B1F13',
  },
  logoutLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
