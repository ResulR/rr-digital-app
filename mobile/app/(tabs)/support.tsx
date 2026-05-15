import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../../src/components/AppCard';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function SupportScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SUPPORT</Text>
        <Text style={styles.title}>Demander de l'aide</Text>
      </View>

      <View style={styles.section}>
        <AppCard>
          <Text style={styles.cardTitle}>Bientôt disponible</Text>
          <Text style={styles.cardBody}>
            Vous pourrez bientôt envoyer une demande à votre équipe RR Digital
            directement depuis cet espace.
          </Text>
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
});
