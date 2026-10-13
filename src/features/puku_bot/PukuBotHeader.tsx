import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PukuBotItem } from '../../types';
import {
  SidebarToggleIcon,
  PukuBotGradientIcon,
  ChevronDownIcon,
  PlusIcon,
  PukuLogoIcon,
  PukuRemoteGradientIcon,
  SunIcon,
  MoonIcon,
} from '../../components/common/Icons';
import { styles } from './pukuBotStyles';

export interface PukuBotHeaderProps {
  theme: any;
  isDark: boolean;
  monoFont: string;
  availableBots: PukuBotItem[];
  selectedBotId: string;
  isTerminalLive: boolean;
  onOpenDrawer: () => void;
  onOpenBotModal: () => void;
  onNavigateChat: () => void;
  onNavigateCode: () => void;
  onToggleTheme: () => void;
}

export const PukuBotHeader: React.FC<PukuBotHeaderProps> = ({
  theme,
  isDark,
  monoFont,
  availableBots,
  selectedBotId,
  isTerminalLive,
  onOpenDrawer,
  onOpenBotModal,
  onNavigateChat,
  onNavigateCode,
  onToggleTheme,
}) => {
  const { t } = useTranslation();
  const currentBotName = availableBots.find(b => b.id === selectedBotId)?.name || 'General Assistant';

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
          onPress={onOpenDrawer}
          style={styles.leadingBtn}>
          <SidebarToggleIcon size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <PukuBotGradientIcon size={20} />
          <Text
            numberOfLines={1}
            style={[styles.screenTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {t('pukuBot.screenTitle')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenBotModal}
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? 'rgba(176, 179, 252, 0.16)'
                  : 'rgba(72, 77, 208, 0.12)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.badgeText, { color: theme.primaryLight, fontFamily: monoFont }]}>
              {currentBotName}
            </Text>
            <ChevronDownIcon size={10} color={theme.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.trailingGroup}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Choose bot / New conversation"
          activeOpacity={0.7}
          onPress={onOpenBotModal}
          style={styles.actionBtn}>
          <PlusIcon size={17} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to Puku chat"
          activeOpacity={0.7}
          onPress={onNavigateChat}
          style={styles.actionBtn}>
          <PukuLogoIcon size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('chat.remoteSessions', { defaultValue: 'Remote sessions' })}
          activeOpacity={0.7}
          onPress={onNavigateCode}
          style={styles.actionBtn}>
          <PukuRemoteGradientIcon size={19} />
          {isTerminalLive && (
            <View style={[styles.liveDot, { backgroundColor: theme.primaryLight }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
          onPress={onToggleTheme}
          style={styles.trailingBtn}>
          {isDark ? (
            <SunIcon size={18} color={theme.textPrimary} />
          ) : (
            <MoonIcon size={18} color={theme.textPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
