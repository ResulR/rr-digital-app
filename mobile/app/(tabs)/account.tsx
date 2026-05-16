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
import { AppCard } from '../../src/components/AppCard';
import { AppScreen } from '../../src/components/AppScreen';
import { apiRequest, ApiError } from '../../src/lib/apiClient';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

type HealthResult =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; service: string; timestamp: string }
  | { kind: 'error'; message: string };

interface HealthPayload {
  status: string;
  service: string;
  timestamp: string;
}

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

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [healthResult, setHealthResult] = useState<HealthResult>({
    kind: 'idle',
  });
  const [loggingOut, setLoggingOut] = useState(false);

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMPTE</Text>
        <Text style={styles.title}>Mon compte</Text>
      </View>

      {user ? (
        <View style={styles.section}>
          <AppCard>
            <Text style={styles.cardTitle}>{user.fullName}</Text>
            <Text style={styles.cardBody}>{user.email}</Text>
            <Text style={styles.cardMeta}>{labelForRole(user.globalRole)}</Text>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic</Text>
        <AppCard>
          <Text style={styles.cardBody}>
            Vérifier la connectivité avec l&apos;API RR Digital.
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
              <Text style={styles.statusOkTitle}>API connectée</Text>
              <Text style={styles.statusBody}>
                Service : {healthResult.service}
              </Text>
              <Text style={styles.statusBody}>
                Réponse : {healthResult.timestamp}
              </Text>
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
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

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
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  cardTitle: {
    ...typography.title,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cardMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
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
  statusOk: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
  logoutButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  logoutButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  logoutLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
