import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  CheckmarkIcon,
  ConnectorsBranchIcon,
  CopyIcon,
  PaperclipIcon,
  PencilIcon,
  RefreshIcon,
} from '../../../components/common/Icons';
import { NativeClipboard } from '../../../services/nativeModules';
import { ThemeColors } from '../../../theme/theme';
import { ChatMessage } from '../../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeColors;
  onEditPrompt?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onBranch?: (messageId: string) => void;
  isGenerating?: boolean;
}

export function MessageBubble({
  message,
  theme,
  onEditPrompt,
  onRegenerate,
  onBranch,
  isGenerating = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isBranched, setIsBranched] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    await NativeClipboard.setString(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const handleBranchClick = () => {
    if (onBranch) {
      onBranch(message.id);
      setIsBranched(true);
      setTimeout(() => setIsBranched(false), 1800);
    }
  };

  if (isUser) {
    return (
      <View style={styles.userWrapper}>
        <View style={styles.userRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => onEditPrompt?.(message.content)}
            style={[
              styles.userBubble,
              { backgroundColor: theme.userBubble },
            ]}>
            {message.attachments?.map((att, idx) => (
              <View key={att.id || idx} style={styles.bubbleAttachmentItem}>
                {att.type === 'image' && att.uri ? (
                  <Image source={{ uri: att.uri }} style={styles.bubbleImageAttachment} resizeMode="cover" />
                ) : (
                  <View style={[styles.bubbleDocAttachment, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
                    <PaperclipIcon size={16} color={theme.onUserBubble} />
                    <Text numberOfLines={1} style={[styles.bubbleDocName, { color: theme.onUserBubble }]}>
                      {att.name}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {!!message.content && (
              <Text style={[styles.userText, { color: theme.onUserBubble }]}>
                {message.content}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {!!message.content && (
          <View style={styles.userActionRow}>
            {/* Copy button */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleCopy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtn}>
              {isCopied ? (
                <CheckmarkIcon size={15} color="#52C41A" />
              ) : (
                <CopyIcon size={15} color={theme.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Edit and resend button */}
            {!!onEditPrompt && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onEditPrompt(message.content)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.actionBtn, { marginLeft: 12 }]}>
                <PencilIcon size={15} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // If assistant message has no content:
  // ONLY show typing indicator ("Thinking...") if actively generating right now.
  // Never show for past/historical messages.
  if (!message.content || !message.content.trim()) {
    if (isGenerating) {
      return (
        <View style={styles.assistantWrapper}>
          <View style={styles.assistantRow}>
            <View style={[styles.assistantCard, { backgroundColor: 'transparent' }]}>
              <TypingIndicator theme={theme} />
            </View>
          </View>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={styles.assistantWrapper}>
      <View style={styles.assistantRow}>
        <View
          style={[
            styles.assistantCard,
            { backgroundColor: theme.assistantBubble },
          ]}>
          <MarkdownRenderer content={message.content} theme={theme} />
        </View>
      </View>
      {!!message.content && (
        <View style={styles.assistantActionRow}>
          {/* Copy button */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleCopy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}>
            {isCopied ? (
              <CheckmarkIcon size={15} color="#52C41A" />
            ) : (
              <CopyIcon size={15} color={theme.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Again search / Regenerate button */}
          {!!onRegenerate && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onRegenerate(message.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.actionBtn, { marginLeft: 12 }]}>
              <RefreshIcon size={15} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Branch / Share button */}
          {!!onBranch && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleBranchClick}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.actionBtn, { marginLeft: 12 }]}>
              {isBranched ? (
                <CheckmarkIcon size={15} color="#52C41A" />
              ) : (
                <ConnectorsBranchIcon size={16} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          )}
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
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  userActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },
  assistantWrapper: {
    marginVertical: 6,
    width: '100%',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    width: '100%',
  },
  assistantCard: {
    width: '100%',
    paddingVertical: 4,
  },
  assistantActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
  },
  bubbleAttachmentItem: {
    marginBottom: 6,
  },
  bubbleImageAttachment: {
    width: 200,
    height: 140,
    borderRadius: 10,
    marginBottom: 4,
  },
  bubbleDocAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  bubbleDocName: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});
