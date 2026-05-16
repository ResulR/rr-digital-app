import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function AccountScreen() {
  const [result, setResult] = useState<HealthResult>({ kind: 'idle' });

  const handleTest = async () => {
    setResult({ kind: 'loading' });
    try {
      const data = await apiRequest<HealthPayload>('/health');
      setResult({
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
      setResult({ kind: 'error', message });
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMPTE</Text>
        <Text style={styles.title}>Mon compte</Text>
      </View>

      <View style={styles.section}>
        <AppCard>
          <Text style={styles.cardTitle}>Bientôt disponible</Text>
          <Text style={styles.cardBody}>
            Profil, préférences et déconnexion seront accessibles ici.
          </Text>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic</Text>
        <AppCard>
          <Text style={styles.cardBody}>
            Vérifier la connectivité avec l'API RR Digital.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              result.kind === 'loading' && styles.buttonDisabled,
            ]}
            onPress={handleTest}
            disabled={result.kind === 'loading'}
          >
            {result.kind === 'loading' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonLabel}>Tester l'API</Text>
            )}
          </Pressable>

          {result.kind === 'ok' && (
            <View style={styles.statusOk}>
              <Text style={styles.statusOkTitle}>API connectée</Text>
              <Text style={styles.statusBody}>
                Service : {result.service}
              </Text>
              <Text style={styles.statusBody}>
                Réponse : {result.timestamp}
              </Text>
            </View>
          )}

          {result.kind === 'error' && (
            <View style={styles.statusError}>
              <Text style={styles.statusErrorTitle}>API indisponible</Text>
              <Text style={styles.statusBody}>{result.message}</Text>
            </View>
          )}
        </AppCard>
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
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primarySoft,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
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
});
