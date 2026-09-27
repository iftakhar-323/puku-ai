import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckmarkIcon, CopyIcon } from '../../../components/common/Icons';
import { NativeClipboard } from '../../../services/nativeModules';
import { ThemeColors } from '../../../theme/theme';
import { ChatMessage } from '../../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeColors;
}

export function MessageBubble({ message, theme }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    await NativeClipboard.setString(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  if (isUser) {
    return (
      <View style={styles.userWrapper}>
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
        {!!message.content && (
          <View style={styles.userActionRow}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleCopy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}>
              {isCopied ? (
                <CheckmarkIcon size={14} color="#52C41A" />
              ) : (
                <CopyIcon size={14} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.assistantWrapper}>
      <View style={styles.assistantRow}>
        <View
          style={[
            styles.assistantCard,
            { backgroundColor: theme.assistantBubble },
          ]}>
          {!message.content ? (
            <TypingIndicator theme={theme} />
          ) : (
            <MarkdownRenderer content={message.content} theme={theme} />
          )}
        </View>
      </View>
      {!!message.content && (
        <View style={styles.assistantActionRow}>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleCopy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}>
            {isCopied ? (
              <CheckmarkIcon size={14} color="#52C41A" />
            ) : (
              <CopyIcon size={14} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrapper: {
    marginVertical: 4,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  userActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 3,
  },
  assistantWrapper: {
    marginVertical: 4,
    width: '100%',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    width: '100%',
  },
  assistantCard: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 3,
  },
  actionBtn: {
    padding: 4,
    borderRadius: 6,
  },
});
