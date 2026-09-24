import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BackIcon,
  CloseIcon,
  IncognitoIcon,
  MenuIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatHeaderProps {
  theme: ThemeColors;
  showsBackButton?: boolean;
  isIncognitoMode?: boolean;
  title?: string | null;
  onLeadingTap: () => void;
  onTrailingTap: () => void;
}

export function ChatHeader({
  theme,
  showsBackButton = false,
  isIncognitoMode = false,
  title,
  onLeadingTap,
  onTrailingTap,
}: ChatHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onLeadingTap}
        style={styles.actionBtn}>
        {showsBackButton ? (
          <BackIcon size={24} color={theme.textPrimary} />
        ) : (
          <MenuIcon size={24} color={theme.textPrimary} />
        )}
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        {isIncognitoMode ? (
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {title || 'Incognito'}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onTrailingTap}
        style={styles.actionBtn}>
        {isIncognitoMode ? (
          <CloseIcon size={22} color={theme.textPrimary} />
        ) : (
          <IncognitoIcon size={24} color={theme.textPrimary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
