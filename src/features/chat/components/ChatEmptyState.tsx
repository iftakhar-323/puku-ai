import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PukuLogoIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatEmptyStateProps {
  theme: ThemeColors;
}

export function ChatEmptyState({ theme }: ChatEmptyStateProps) {
  return (
    <View style={styles.container}>
      <PukuLogoIcon size={56} />
      <View style={styles.textContainer}>
        <Text style={[styles.headlinePrefix, { color: theme.textPrimary }]}>
          How can i help you{' '}
          <Text style={[styles.headlineAccent, { color: theme.textMuted }]}>
            today!
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  headlinePrefix: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    fontWeight: '800',
  },
});
