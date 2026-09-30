import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BackIcon,
  BotIcon,
  CloseIcon,
  GhostIcon,
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
  onShare?: () => void;
  showShare?: boolean;
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
  onShare,
  showShare = false,
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
            onPress={onLeadingTap}
            style={styles.actionBtn}>
            {showsBackButton ? (
              <BackIcon size={20} color={theme.textPrimary} />
            ) : (
              <SidebarToggleIcon size={20} color={theme.textPrimary} />
            )}
          </TouchableOpacity>

          {title ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.topBarTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
              {title}
            </Text>
          ) : null}
        </View>
      )}

      {isIncognitoMode ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onTrailingTap}
          style={styles.actionBtn}>
          <CloseIcon size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.trailingGroup}>
          {showShare && onShare ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onShare}
              style={[
                styles.shareBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.cardBackground,
                },
              ]}>
              <Text style={[styles.shareBtnText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Share
              </Text>
            </TouchableOpacity>
          ) : null}

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
              <BotIcon size={19} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {onThemeTap && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onThemeTap}
              style={styles.actionBtn}>
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
    paddingHorizontal: 8,
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  incognitoLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
  },
  incognitoTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 160,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 2,
  },
  shareBtnText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
