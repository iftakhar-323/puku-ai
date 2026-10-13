import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PukuBotItem } from '../../types';
import { CloseIcon, CheckmarkIcon } from '../../components/common/Icons';
import { styles } from './pukuBotStyles';

export interface PukuBotSelectModalProps {
  visible: boolean;
  theme: any;
  isDark: boolean;
  monoFont: string;
  availableBots: PukuBotItem[];
  selectedBotId: string;
  onSelectBot: (botId: string) => void;
  onClose: () => void;
}

export const PukuBotSelectModal: React.FC<PukuBotSelectModalProps> = ({
  visible,
  theme,
  isDark,
  monoFont,
  availableBots,
  selectedBotId,
  onSelectBot,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
              {t('pukuBot.selectBot')}
            </Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
              <CloseIcon size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingVertical: 12, gap: 8 }}>
            {availableBots.map(bot => {
              const isSelected = bot.id === selectedBotId;
              return (
                <TouchableOpacity
                  key={bot.id}
                  activeOpacity={0.7}
                  onPress={() => onSelectBot(bot.id)}
                  style={[
                    styles.botSelectRow,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? '#1C271E' : '#E0F3E5')
                        : 'transparent',
                      borderColor: isSelected ? '#94C7A0' : theme.border,
                    },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.botSelectName, { color: theme.textPrimary, fontFamily: monoFont }]}>
                      {bot.name || bot.title}
                    </Text>
                    {bot.description ? (
                      <Text
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={[styles.botSelectDesc, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {bot.description}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && <CheckmarkIcon size={16} color={isDark ? '#94C7A0' : '#2D7543'} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};
