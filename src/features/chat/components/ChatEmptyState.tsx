import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUpRightIcon,
  CodeIcon,
  LearnIcon,
  LifeIcon,
  PukuLogoIcon,
  SparkleIcon,
  WriteIcon,
} from '../../../components/common/Icons';
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

function getGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Back at it';
}

function getFirstName(fullName?: string): string {
  if (!fullName?.trim()) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

const SUGGESTIONS = [
  {
    label: 'Write',
    icon: (color: string) => <WriteIcon size={14} color={color} />,
    prompt: 'Help me write a clear product announcement email.',
  },
  {
    label: 'Learn',
    icon: (color: string) => <LearnIcon size={14} color={color} />,
    prompt: 'Explain how transformer attention works with a simple analogy.',
  },
  {
    label: 'Code',
    icon: (color: string) => <CodeIcon size={14} color={color} />,
    prompt: 'Write a TypeScript debounce function with types and an example.',
  },
  {
    label: 'Life stuff',
    icon: (color: string) => <LifeIcon size={14} color={color} />,
    prompt: 'Give me a weekly meal prep plan for busy weekdays.',
  },
  {
    label: "puku's choice",
    icon: (color: string) => <SparkleIcon size={14} color={color} />,
    prompt: 'Surprise me with something useful I might not have thought to ask.',
  },
];

export function ChatEmptyState({
  theme,
  conversations = [],
  userName,
  onSelectConversation,
  onPromptTap,
}: ChatEmptyStateProps) {
  const greetingLead = `${getGreetingPrefix()},`;
  const name = getFirstName(userName);

  // If user has real conversations, show top 4; otherwise show sample conversations
  const displayItems =
    conversations.length > 0
      ? conversations.slice(0, 4).map(c => {
          const rawTime =
            (c as any).updated_at ||
            (c as any).created_at ||
            c.updatedAtTimestamp ||
            (c as any).updatedAt ||
            (c as any).createdAt ||
            c.activityDate;
          let formatted = formatActivityDate(rawTime);
          if (!formatted || formatted === 'Recent') {
            formatted = 'Just now';
          }
          return {
            id: c.id,
            title: c.title || 'Untitled conversation',
            time: formatted,
            isReal: true,
          };
        })
      : [
          {
            id: 'sample-1',
            title: 'Exploring Transformer Attention',
            time: '1h ago',
            isReal: false,
          },
          {
            id: 'sample-2',
            title: 'TypeScript Fullstack Architecture',
            time: '4h ago',
            isReal: false,
          },
          {
            id: 'sample-3',
            title: 'Puku AI Model Capabilities',
            time: '1d ago',
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
      {/* 1:1 Authentic Web Greeting Row */}
      <View style={styles.greetingRow}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../../assets/images/app_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.greetingTitle}>
          <Text style={[styles.greetingMuted, { color: theme.textMuted }]}>
            {greetingLead}{' '}
          </Text>
          <Text style={[styles.greetingName, { color: theme.textPrimary }]}>
            {name}!!!
          </Text>
        </Text>
      </View>

      {/* Suggestion Chips Row (matching puku-web-chat SUGGESTIONS) */}
      <View style={styles.suggestionRow}>
        {SUGGESTIONS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.7}
            onPress={() => onPromptTap?.(item.prompt)}
            style={[
              styles.suggestionChip,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}>
            {item.icon(theme.textMuted)}
            <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Conversations Section */}
      <View style={styles.recentsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          Recent conversations
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
                style={[styles.recentItemTitle, { color: theme.textPrimary }]}>
                {item.title}
              </Text>
              <View style={styles.recentItemMeta}>
                <Text style={[styles.recentItemTime, { color: theme.textMuted }]}>
                  {item.time}
                </Text>
                <ArrowUpRightIcon size={14} color={theme.textMuted} />
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
    paddingTop: 24,
    paddingBottom: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingTop: 8,
  },
  logoWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 34,
    height: 34,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  greetingMuted: {
    fontWeight: '400',
  },
  greetingName: {
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentsSection: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
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
    fontWeight: '500',
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
