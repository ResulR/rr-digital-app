import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../src/auth/AuthContext';
import { AppScreen } from '../src/components/AppScreen';
import { ApiError } from '../src/lib/apiClient';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isRestoringSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // While the session is being restored from SecureStore, render nothing.
  // The tabs layout will handle the spinner and redirect if authenticated.
  if (isRestoringSession) return null;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleSubmit = async () => {
    if (loading) return;
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      setPassword('');
      router.replace('/(tabs)/home');
    } catch (err) {
      setErrorMsg(messageForLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bonjour. Heureux de vous revoir.</Text>
          <Text style={styles.subtitle}>
            Connectez-vous à votre espace pour suivre vos projets.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="vous@exemple.com"
              placeholderTextColor={colors.textMuted}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              editable={!loading}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonLabel}>Se connecter</Text>
            )}
          </Pressable>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.helper}>
            Besoin d&apos;aide ? Contactez votre référent.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

function messageForLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return 'Pas de connexion. Vérifiez votre réseau et réessayez.';
    }
    if (err.status === 401) {
      return 'Email ou mot de passe incorrect.';
    }
    if (err.status === 429) {
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    }
  }
  return 'Connexion impossible pour le moment.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.primarySoft,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FBEEEC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6BFB7',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: '#8A2A1B',
  },
  helper: {
    ...typography.small,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});


