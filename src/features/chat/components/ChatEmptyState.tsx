import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowUpRightIcon } from '../../../components/common/Icons';
import { RetroComputerIllustration } from '../../../components/common/RetroComputerIllustration';
import { ThemeColors } from '../../../theme/theme';
import { Conversation } from '../../../types';
import { formatActivityDate } from '../../../utils/date';

interface ChatEmptyStateProps {
  theme: ThemeColors;
  conversations?: Conversation[];
  userName?: string;
  onSelectConversation?: (id: string) => void;
  onPromptTap?: (prompt: string) => void;
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 12 && h < 17) return 'chatEmptyState.greetingAfternoon';
  if (h >= 17 && h < 22) return 'chatEmptyState.greetingEvening';
  if (h >= 22 || h < 5) return 'chatEmptyState.greetingLate';
  return 'chatEmptyState.greetingMorning';
}

export function ChatEmptyState({
  theme,
  conversations = [],
  userName,
  onSelectConversation,
  onPromptTap,
}: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const greetingLead = t(getGreetingKey());
  let greetingName = t('chatEmptyState.greetingFallbackName');
  if (userName?.trim()) {
    greetingName = userName.trim().split(/\s+/)[0];
    greetingName = greetingName.charAt(0).toUpperCase() + greetingName.slice(1);
  }
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  // If user has real conversations, show top 3; otherwise show matching sample conversations from Image 1
  const displayItems =
    conversations.length > 0
      ? conversations.slice(0, 3).map(c => {
          const rawTime =
            (c as any).updated_at ||
            (c as any).created_at ||
            c.updatedAtTimestamp ||
            (c as any).updatedAt ||
            (c as any).createdAt ||
            c.activityDate;
          let formatted = formatActivityDate(rawTime);
          if (!formatted || formatted === 'Recent') {
            formatted = t('chatEmptyState.justNow');
          }
          return {
            id: c.id,
            title: c.title || t('chatEmptyState.untitledConversation'),
            time: formatted,
            isReal: true,
          };
        })
      : [
          {
            id: 'sample-1',
            title: 'what is ml',
            time: '3h ago',
            isReal: false,
          },
          {
            id: 'sample-2',
            title: 'Which model you used??',
            time: '3h ago',
            isReal: false,
          },
          {
            id: 'sample-3',
            title: 'df',
            time: '5h ago',
            isReal: false,
          },
        ];

  const handleItemPress = (item: (typeof displayItems)[0]) => {
    if (item.isReal && onSelectConversation) {
      onSelectConversation(item.id);
    } else if (onPromptTap) {
      onPromptTap(item.title);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Hero Header with Dynamic Greeting (Format 2: Bold Sans-Serif) & Retro Computer Illustration (Image 1) */}
      <View style={styles.heroRow}>
        <View style={styles.headlineWrapper}>
          <Text style={[styles.headlineLead, { color: theme.textSecondary }]}>
            {greetingLead}
          </Text>
          <Text style={[styles.headlineName, { color: theme.textPrimary }]}>
            {greetingName}
          </Text>
        </View>
        <View
          style={[
            styles.computerWrapper,
            { backgroundColor: theme.cardBackground, borderColor: theme.outline },
          ]}
        >
          <RetroComputerIllustration
            style={styles.computerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Recent Conversations Section (Format 3: Typewriter monospace font matching Image 3) */}
      <View style={styles.recentsSection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.textSecondary, fontFamily: monoFont },
          ]}>
          {t('chatEmptyState.recentConversations')}
        </Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {displayItems.map((item, index) => (
          <View key={item.id || index}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleItemPress(item)}
              style={styles.recentItemRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.recentItemTitle,
                  { color: theme.textPrimary, fontFamily: monoFont },
                ]}>
                {item.title}
              </Text>
              <View style={styles.recentItemMeta}>
                <Text
                  style={[
                    styles.recentItemTime,
                    { color: theme.textSecondary, fontFamily: monoFont },
                  ]}>
                  {item.time}
                </Text>
                <ArrowUpRightIcon size={14} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 8,
  },
  headlineWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  headlineLead: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  headlineName: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  computerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12, // official Puku "panelRadius" token
    borderWidth: 1,
  },
  computerImage: {
    width: 120,
    height: 112,
  },
  recentsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  recentItemTitle: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  recentItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentItemTime: {
    fontSize: 12,
  },
});
