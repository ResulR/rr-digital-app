import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../../src/components/AppCard';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function HomeScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACCUEIL</Text>
        <Text style={styles.title}>Votre espace</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aperçu</Text>
        <AppCard>
          <Text style={styles.cardTitle}>Bientôt disponible</Text>
          <Text style={styles.cardBody}>
            Les indicateurs clés de vos projets s'afficheront ici.
          </Text>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité récente</Text>
        <AppCard>
          <Text style={styles.cardBody}>
            Aucune activité à afficher pour le moment.
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
});
