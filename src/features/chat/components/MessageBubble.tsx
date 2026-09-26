import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../../theme/theme';
import { ChatMessage } from '../../../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeColors;
}

export function MessageBubble({ message, theme }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: theme.userBubble },
          ]}>
          <Text style={[styles.userText, { color: theme.onUserBubble }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View
        style={[
          styles.assistantCard,
          { backgroundColor: theme.assistantBubble },
        ]}>
        <MarkdownRenderer content={message.content} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 6,
    paddingHorizontal: 16,
    width: '100%',
  },
  assistantCard: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
