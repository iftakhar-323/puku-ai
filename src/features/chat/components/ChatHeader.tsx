import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BackIcon,
  BotIcon,
  CloseIcon,
  MoonIcon,
  SidebarToggleIcon,
  SunIcon,
  TerminalPromptIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatHeaderProps {
  theme: ThemeColors;
  isDark?: boolean;
  showsBackButton?: boolean;
  isIncognitoMode?: boolean;
  title?: string | null;
  onLeadingTap: () => void;
  onTrailingTap?: () => void;
  onTerminalTap?: () => void;
  onBotTap?: () => void;
  onThemeTap?: () => void;
}

export function ChatHeader({
  theme,
  isDark = true,
  showsBackButton = false,
  isIncognitoMode = false,
  title,
  onLeadingTap,
  onTrailingTap,
  onTerminalTap,
  onBotTap,
  onThemeTap,
}: ChatHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onLeadingTap}
        style={styles.actionBtn}>
        {showsBackButton ? (
          <BackIcon size={22} color={theme.textPrimary} />
        ) : (
          <SidebarToggleIcon size={22} color={theme.textPrimary} />
        )}
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        {isIncognitoMode ? (
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {title || 'Incognito'}
          </Text>
        ) : null}
      </View>

      <View style={styles.trailingGroup}>
        {isIncognitoMode ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onTrailingTap}
            style={styles.actionBtn}>
            <CloseIcon size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        ) : (
          <>
            {onTerminalTap && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onTerminalTap}
                style={styles.actionBtn}>
                <TerminalPromptIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}

            {onBotTap && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onBotTap}
                style={styles.actionBtn}>
                <BotIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}

            {onThemeTap && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onThemeTap}
                style={styles.actionBtn}>
                {isDark ? (
                  <SunIcon size={20} color={theme.textPrimary} />
                ) : (
                  <MoonIcon size={20} color={theme.textPrimary} />
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
