import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowUpRightIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { Conversation } from '../../../types';
import { formatActivityDate } from '../../../utils/date';

interface ChatEmptyStateProps {
  theme: ThemeColors;
  conversations?: Conversation[];
  onSelectConversation?: (id: string) => void;
  onPromptTap?: (prompt: string) => void;
}

export function ChatEmptyState({
  theme,
  conversations = [],
  onSelectConversation,
  onPromptTap,
}: ChatEmptyStateProps) {
  // If user has real conversations, show top 3; otherwise show matching sample conversations from screenshot
  const displayItems =
    conversations.length > 0
      ? conversations.slice(0, 3).map(c => ({
          id: c.id,
          title: c.title || 'Untitled conversation',
          time: formatActivityDate((c as any).activityDate || c.updatedAtTimestamp || c.createdAt),
          isReal: true,
        }))
      : [
          {
            id: 'sample-1',
            title: 'df',
            time: '20m ago',
            isReal: false,
          },
          {
            id: 'sample-2',
            title: 'which model are you used?',
            time: '21h ago',
            isReal: false,
          },
          {
            id: 'sample-3',
            title: 'What is ai?',
            time: '21h ago',
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

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  return (
    <View style={styles.container}>
      {/* Hero Header with Authentic Retro Computer & PUKU ASCII Screen */}
      <View style={styles.heroRow}>
        <View style={styles.headlineWrapper}>
          <Text style={[styles.headlineText, { color: theme.textPrimary }]}>
            {'Where will your\ncuriosity take\nyou?'}
          </Text>
        </View>
        <View style={styles.computerWrapper}>
          <Image
            source={require('../../../../assets/images/retro_puku_computer.png')}
            style={styles.computerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Recent Conversations Section */}
      <View style={styles.recentsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: monoFont }]}>
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
                    { color: theme.textMuted, fontFamily: monoFont },
                  ]}>
                  {item.time}
                </Text>
                <ArrowUpRightIcon size={14} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  headlineText: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.3,
  },
  computerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
