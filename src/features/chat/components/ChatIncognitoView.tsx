import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IncognitoIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatIncognitoViewProps {
  theme: ThemeColors;
  onLearnMoreTap?: () => void;
}

export function ChatIncognitoView({
  theme,
  onLearnMoreTap,
}: ChatIncognitoViewProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconBox}>
        <IncognitoIcon size={64} color={theme.textPrimary} />
      </View>

      <Text style={[styles.bodyText, { color: theme.textMuted }]}>
        Incognito mode lets you chat privately. Messages and data in this session
        are not saved to your conversation history and won't appear on any other
        devices.
      </Text>

      <Text style={[styles.noteText, { color: theme.textMuted }]}>
        Temporary sessions expire automatically when you leave this screen.
      </Text>

      <TouchableOpacity activeOpacity={0.7} onPress={onLearnMoreTap}>
        <Text style={[styles.learnMore, { color: theme.textMuted }]}>
          Learn more
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconBox: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  learnMore: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
