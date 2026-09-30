import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BackIcon,
  BotIcon,
  CloseIcon,
  GhostIcon,
  MoonIcon,
  PukuBotGradientIcon,
  PukuLogoIcon,
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
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  return (
    <View style={styles.container}>
      {isIncognitoMode ? (
        <View style={styles.incognitoLeftGroup}>
          <GhostIcon size={20} color={theme.textPrimary} eyeColor={theme.background} />
          <Text style={[styles.incognitoTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Incognito chat
          </Text>
        </View>
      ) : (
        <View style={styles.leftGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
            onPress={onLeadingTap}
            style={styles.leadingBtn}>
            {showsBackButton ? (
              <BackIcon size={20} color={theme.textPrimary} />
            ) : (
              <SidebarToggleIcon size={20} color={theme.textPrimary} />
            )}
          </TouchableOpacity>

          <View style={styles.brandTitleWrap}>
            <PukuLogoIcon size={20} />
            <Text style={[styles.brandTitleText, { color: theme.textPrimary, fontFamily: monoFont }]}>
              puku ai
            </Text>
          </View>

          {title ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.topBarTitle, { color: theme.textMuted, fontFamily: monoFont }]}>
              • {title}
            </Text>
          ) : null}
        </View>
      )}

      {isIncognitoMode ? (
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
          onPress={onTrailingTap}
          style={styles.trailingBtn}>
          <CloseIcon size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.trailingGroup}>
          {onTrailingTap && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onTrailingTap}
              style={styles.actionBtn}>
              <GhostIcon size={19} color={theme.textSecondary} eyeColor={theme.background} />
            </TouchableOpacity>
          )}

          {onTerminalTap && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onTerminalTap}
              style={styles.actionBtn}>
              <TerminalPromptIcon size={19} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {onBotTap && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onBotTap}
              style={styles.actionBtn}>
              <PukuBotGradientIcon size={20} />
            </TouchableOpacity>
          )}

          {onThemeTap && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
              onPress={onThemeTap}
              style={styles.trailingBtn}>
              {isDark ? (
                <SunIcon size={19} color={theme.textSecondary} />
              ) : (
                <MoonIcon size={19} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
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
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  leadingBtn: {
    width: 22,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  incognitoLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incognitoTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitleText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingBtn: {
    width: 22,
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
