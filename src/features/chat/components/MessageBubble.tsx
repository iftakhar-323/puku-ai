import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDownIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ChatMessage } from '../../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeColors;
}

export function MessageBubble({ message, theme }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const thinkingBlock = message.blocks?.find(b => b.type === 'thinking');

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.userRow : styles.assistantRow,
      ]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubble }]
            : [styles.assistantBubble, { backgroundColor: theme.assistantBubble, borderColor: theme.outline }],
        ]}>
        {/* Thinking Accordion for assistant */}
        {!isUser && thinkingBlock && (
          <View style={styles.thinkingContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsThinkingExpanded(!isThinkingExpanded)}
              style={styles.thinkingHeader}>
              <Text style={[styles.thinkingTitle, { color: theme.accent }]}>
                Thinking
              </Text>
              <View
                style={{
                  transform: [{ rotate: isThinkingExpanded ? '180deg' : '0deg' }],
                }}>
                <ChevronDownIcon size={14} color={theme.accent} />
              </View>
            </TouchableOpacity>

            {isThinkingExpanded && (
              <View
                style={[
                  styles.thinkingContent,
                  { backgroundColor: theme.thinkingBackground, borderColor: theme.outline },
                ]}>
                <Text style={[styles.thinkingText, { color: theme.textMuted }]}>
                  {thinkingBlock.text}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Message Content */}
        <Text
          style={[
            styles.messageText,
            { color: isUser ? '#FFFFFF' : theme.textPrimary },
          ]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  thinkingContainer: {
    marginBottom: 8,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  thinkingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  thinkingContent: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  thinkingText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
