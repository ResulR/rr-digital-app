import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface AppScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Pass a <RefreshControl> element to enable pull-to-refresh on the ScrollView. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

export function AppScreen({ children, scroll = true, refreshControl }: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    flexGrow: 1,
  },
});
