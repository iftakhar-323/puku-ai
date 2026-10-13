import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RetroComputerIllustration } from '../../components/common/RetroComputerIllustration';
import { PinIcon, TrashIcon, ArrowUpRightIcon } from '../../components/common/Icons';
import { styles } from './pukuBotStyles';

export interface RecentConversationItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  unread: boolean;
  pinned: boolean;
  sortAt: string;
  isReal: boolean;
}

export interface PukuBotHomeViewProps {
  theme: any;
  monoFont: string;
  greeting: { lead: string; name: string };
  recentConversations: RecentConversationItem[];
  isAuthenticated: boolean;
  onSelectRecentConv: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const PukuBotHomeView: React.FC<PukuBotHomeViewProps> = ({
  theme,
  monoFont,
  greeting,
  recentConversations,
  isAuthenticated,
  onSelectRecentConv,
  onTogglePin,
  onDeleteConversation,
}) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      style={styles.emptyScrollView}
      contentContainerStyle={styles.emptyScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* 1. Hero Row with Dynamic Greeting & Retro Computer Illustration */}
      <View style={styles.botHeroRow}>
        <View style={styles.botHeadlineWrapper}>
          <Text style={[styles.botHeadlineLead, { color: theme.textSecondary }]}>
            {greeting.lead}
          </Text>
          <Text style={[styles.botHeadlineName, { color: theme.textPrimary }]}>
            {greeting.name}
          </Text>
        </View>
        <View
          style={[
            styles.botComputerWrapper,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}>
          <RetroComputerIllustration
            style={styles.botComputerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* 2. Recent Conversations Section */}
      <View style={styles.botRecentsSection}>
        <Text style={[styles.botRecentsTitle, { color: theme.textSecondary, fontFamily: monoFont }]}>
          {t('pukuBot.recentConversations')}
        </Text>
        <View style={[styles.botDivider, { backgroundColor: theme.border }]} />

        {recentConversations.length === 0 && (
          <View>
            <Text style={[styles.botRecentsEmpty, { color: theme.textMuted, fontFamily: monoFont }]}>
              {t('pukuBot.noConversations', { defaultValue: 'No conversations yet. Send a message to start one.' })}
            </Text>
          </View>
        )}

        {recentConversations.map(conv => (
          <View key={conv.id}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={conv.title}
              activeOpacity={0.7}
              onPress={() => onSelectRecentConv(conv.id)}
              style={styles.botRecentItemRow}>
              <View style={styles.botRecentTextWrap}>
                <View style={styles.botRecentTitleRow}>
                  {conv.pinned && <PinIcon size={14} color="#35D6B4" />}
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.botRecentItemTitle,
                      { color: theme.textPrimary, fontFamily: monoFont, fontWeight: conv.unread ? '700' : '500' },
                    ]}>
                    {conv.title}
                  </Text>
                </View>
                {!!conv.subtitle && (
                  <Text
                    numberOfLines={1}
                    style={[styles.botRecentSubtitle, { color: theme.textMuted, fontFamily: monoFont }]}>
                    {conv.subtitle}
                  </Text>
                )}
              </View>
              <View style={styles.botRecentRightWrap}>
                {conv.unread && (
                  <View
                    accessibilityLabel={t('pukuBot.unread', { defaultValue: 'Unread' })}
                    style={[styles.unreadDot, { backgroundColor: '#35D6B4' }]}
                  />
                )}
                <Text style={[styles.botRecentItemTime, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {conv.time}
                </Text>
                {isAuthenticated && conv.isReal && (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={conv.pinned ? 'Unpin conversation' : 'Pin conversation'}
                      onPress={() => onTogglePin(conv.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.botRecentIconBtn}>
                      <PinIcon size={14} color={conv.pinned ? '#35D6B4' : theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Delete conversation"
                      onPress={() => onDeleteConversation(conv.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.botRecentIconBtn}>
                      <TrashIcon size={14} color="#FF4D4F" />
                    </TouchableOpacity>
                  </>
                )}
                <ArrowUpRightIcon size={14} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
            <View style={[styles.botDivider, { backgroundColor: theme.border }]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

