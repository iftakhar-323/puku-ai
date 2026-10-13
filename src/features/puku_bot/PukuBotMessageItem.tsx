import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import {
  PukuBotToolCall,
  PukuBotAttachment,
} from '../../types';
import {
  BotIcon,
  PaperclipIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  CopyIcon,
  PencilIcon,
} from '../../components/common/Icons';
import { ChatSourcesBar } from '../../components/common/ChatSourcesBar';
import { MarkdownRenderer } from '../chat/components/MarkdownRenderer';
import { TypingIndicator } from '../chat/components/TypingIndicator';
import { NativeClipboard } from '../../services/nativeModules';
import { extractSources } from '../../utils/sourceExtractor';
import { styles } from './pukuBotStyles';

export interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  botId?: string;
  botName?: string;
  kind?: string;
  attachments?: PukuBotAttachment[];
  toolCalls?: PukuBotToolCall[];
  attachment?: { uri: string; name: string; type: string; size?: number };
  notice?: boolean;
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  execute_command: 'Running a command',
  run_command: 'Running a command',
  bash: 'Running a command',
  computer_run_command: 'Running a command',
  computer_click: 'Clicking',
  computer_type: 'Typing',
  computer_key: 'Pressing a key',
  computer_scroll: 'Scrolling',
  computer_screenshot: 'Looking at the screen',
  computer_wait: 'Waiting',
  computer_read_page: 'Reading the page',
  start_background_task: 'Starting a background task',
  report_refusal: 'Declined an action',
};

export function formatToolDisplay(
  name: string,
  args?: any,
  status?: string,
  result?: any
): {
  label: string;
  sourceUrl?: string;
  cleanResult?: string;
} {
  let label = name.replace(/^mcp__.*?__/, '').replace(/_/g, ' ');
  let sourceUrl: string | undefined;

  // 1. Detect URLs (e.g. computer_navigate, browse, fetch_url)
  const rawUrl =
    args?.url ||
    args?.uri ||
    (typeof args === 'string' && (args as string).startsWith('http') ? args : undefined);

  if (rawUrl && typeof rawUrl === 'string') {
    sourceUrl = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host.includes('wikipedia.org')) {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const topic = pathSegments[pathSegments.length - 1];
        const cleanTopic = topic ? decodeURIComponent(topic).replace(/_/g, ' ') : '';
        label = cleanTopic ? `Checking Wikipedia • ${cleanTopic}` : 'Checking Wikipedia';
      } else {
        label = `Opening ${host}`;
      }
    } catch {
      label = 'Opening a web page';
    }
  } else if (name === 'computer_navigate' || name === 'navigate') {
    label = 'Opening a web page';
  } else if (name === 'web_search' || name === 'search') {
    const query = args?.query || args?.q || '';
    label = query ? `Searching: "${query}"` : 'Web Search';
  } else if (TOOL_ACTIVITY_LABELS[name]) {
    label = TOOL_ACTIVITY_LABELS[name];
  } else {
    const sub = name.startsWith('computer_') ? name.replace('computer_', '').replace(/_/g, ' ') : label;
    label = sub.charAt(0).toUpperCase() + sub.slice(1);
  }

  // 2. Format result cleanly - NEVER show raw `{"ok": false, ...}` technical error dump
  let cleanResult: string | undefined;
  if (result !== undefined && result !== null) {
    if (typeof result === 'object') {
      if (result.ok === false) {
        cleanResult = undefined;
      } else if (result.output || result.content || result.text) {
        cleanResult = String(result.output || result.content || result.text).slice(0, 300);
      }
    } else if (typeof result === 'string') {
      if (result.includes('"ok":false') || result.includes('"ok": false')) {
        cleanResult = undefined;
      } else {
        cleanResult = result.slice(0, 300);
      }
    }
  }

  return { label, sourceUrl, cleanResult };
}

export function parseBotContent(rawText: string = ''): { thoughts: string; responseText: string } {
  if (!rawText) return { thoughts: '', responseText: '' };

  let thoughts = '';
  let responseText = rawText;

  // 1. Match completed thought tags: <thought>...</thought> or <thinking>...</thinking>
  const thoughtTagRegex = /<(?:thought|thinking)>([\s\S]*?)<\/(?:thought|thinking)>/gi;
  let match: RegExpExecArray | null;
  const collectedThoughts: string[] = [];

  while ((match = thoughtTagRegex.exec(rawText)) !== null) {
    if (match[1]) {
      collectedThoughts.push(match[1].trim());
    }
  }

  if (collectedThoughts.length > 0) {
    thoughts = collectedThoughts.join('\n\n');
    responseText = rawText.replace(thoughtTagRegex, '').trim();
  }

  // 2. Match unclosed thought tag (still streaming reasoning): <thought>... or <thinking>...
  const unclosedMatch = responseText.match(/<(?:thought|thinking)>([\s\S]*)$/i);
  if (unclosedMatch) {
    const unclosedThought = unclosedMatch[1] ? unclosedMatch[1].trim() : '';
    thoughts = thoughts ? `${thoughts}\n\n${unclosedThought}` : unclosedThought;
    responseText = responseText.replace(/<(?:thought|thinking)>[\s\S]*$/i, '').trim();
  }

  return { thoughts, responseText };
}

export function BotThoughtAccordion({
  thoughts,
  isStreaming,
  theme,
  isDark,
  monoFont,
}: {
  thoughts: string;
  isStreaming: boolean;
  theme: any;
  isDark: boolean;
  monoFont: string;
}) {
  const [expanded, setExpanded] = React.useState(isStreaming);

  React.useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    }
  }, [isStreaming]);

  if (!thoughts.trim()) return null;

  return (
    <View
      style={{
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(53, 214, 180, 0.25)' : 'rgba(45, 117, 67, 0.25)',
        backgroundColor: isDark ? 'rgba(53, 214, 180, 0.06)' : 'rgba(45, 117, 67, 0.05)',
        overflow: 'hidden',
      }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(prev => !prev)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          paddingVertical: 7,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isStreaming ? (
            <ActivityIndicator size="small" color={isDark ? '#35D6B4' : '#2D7543'} />
          ) : (
            <Text style={{ fontSize: 13 }}>🧠</Text>
          )}
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: isDark ? '#35D6B4' : '#2D7543',
              fontFamily: monoFont,
            }}>
            {isStreaming ? 'Thinking...' : 'Thought process'}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon size={12} color={isDark ? '#35D6B4' : '#2D7543'} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(53, 214, 180, 0.15)' : 'rgba(45, 117, 67, 0.15)',
          }}>
          <Text
            style={{
              fontSize: 11.5,
              lineHeight: 17,
              color: theme.textSecondary,
              fontStyle: 'italic',
              fontFamily: monoFont,
            }}>
            {thoughts}
          </Text>
        </View>
      )}
    </View>
  );
}

export interface PukuBotMessageItemProps {
  item: LocalChatMessage;
  index: number;
  totalMessages: number;
  isStreaming: boolean;
  theme: any;
  isDark: boolean;
  monoFont: string;
  expandedToolCallIds: Record<string, boolean>;
  toggleToolCallExpanded: (id: string) => void;
  handleEditMessage: (text: string) => void;
}

export const PukuBotMessageItem: React.FC<PukuBotMessageItemProps> = ({
  item,
  index,
  totalMessages,
  isStreaming,
  theme,
  isDark,
  monoFont,
  expandedToolCallIds,
  toggleToolCallExpanded,
  handleEditMessage,
}) => {
  if (item.notice) {
    const lower = (item.text || '').toLowerCase();
    if (
      lower.includes('session expired') ||
      lower.includes('sign in') ||
      lower.includes('authentication required')
    ) {
      return null;
    }
    return (
      <View style={styles.noticeRow}>
        <Text style={[styles.noticeText, { color: theme.textSecondary, fontFamily: monoFont }]}>
          {item.text}
        </Text>
      </View>
    );
  }

  const isUser = item.role === 'user';
  const { thoughts, responseText } = isUser
    ? { thoughts: '', responseText: item.text }
    : parseBotContent(item.text);
  const { sources: botSources, cleanText: cleanResponseText } = !isUser
    ? extractSources(responseText, item.toolCalls, (item as any).sources)
    : { sources: [], cleanText: responseText };
  const hasToolCalls = !isUser && !!item.toolCalls && item.toolCalls.length > 0;
  const hasThoughts = !isUser && thoughts.trim().length > 0;
  const hasResponseText = !isUser && cleanResponseText.trim().length > 0;
  const isLastItem = index === totalMessages - 1;
  const isWaitingForFirstOutput =
    !isUser && !hasToolCalls && !hasThoughts && !hasResponseText && isStreaming && isLastItem;

  // If an assistant message has no tools, no thoughts, no text, and is not currently waiting/streaming, hide it
  if (!isUser && !hasToolCalls && !hasThoughts && !hasResponseText && !isWaitingForFirstOutput) {
    return null;
  }

  return (
    <View
      style={[
        styles.messageBubbleRow,
        isUser ? styles.userRow : styles.botRow,
      ]}>
      {!isUser && (
        <View style={[styles.botSmallAvatar, { backgroundColor: isDark ? '#262925' : '#E4E5DB' }]}>
          <BotIcon size={16} color={theme.textPrimary} />
        </View>
      )}
      <View style={{ maxWidth: '84%' }}>
        {!isUser && !!item.botName && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: theme.textSecondary,
              marginBottom: 4,
              fontFamily: monoFont,
            }}>
            {item.botName}
          </Text>
        )}

        {item.kind === 'background_task' && (
          <View
            style={{
              marginBottom: 6,
              padding: 10,
              borderRadius: 8,
              backgroundColor: isDark ? '#1C271E' : '#E9F5EB',
              borderWidth: 1,
              borderColor: isDark ? '#2D5E37' : '#BEE2C7',
            }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isDark ? '#94C7A0' : '#2D7543',
                fontFamily: monoFont,
                marginBottom: 2,
              }}>
              Background task started
            </Text>
            {!!item.text && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textPrimary,
                  fontFamily: monoFont,
                }}>
                {item.text}
              </Text>
            )}
          </View>
        )}

        {!!item.attachments && item.attachments.length > 0 && (
          <View style={{ marginBottom: 6, gap: 4 }}>
            {item.attachments.map((att: PukuBotAttachment, attIdx: number) => (
              <View
                key={att.id || attIdx}
                style={[
                  styles.bubbleDocAttachment,
                  {
                    backgroundColor: isUser
                      ? 'rgba(255, 255, 255, 0.12)'
                      : (isDark ? '#262925' : '#E4E5DB'),
                  },
                ]}>
                <PaperclipIcon size={14} color={theme.textPrimary} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.bubbleDocName,
                    { color: theme.textPrimary, fontFamily: monoFont },
                  ]}>
                  {att.name || att.id}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tool execution indicators */}
        {!isUser && hasToolCalls && (
          <View style={styles.toolCallsContainer}>
            {item.toolCalls!.map((tc: PukuBotToolCall) => {
              const isExpanded = !!expandedToolCallIds[tc.id];
              const { label, sourceUrl, cleanResult } = formatToolDisplay(
                tc.name,
                tc.arguments,
                tc.status,
                tc.result
              );
              const hasDetails = !!sourceUrl || !!cleanResult;
              return (
                <View key={tc.id} style={{ marginBottom: 4 }}>
                  <TouchableOpacity
                    activeOpacity={hasDetails ? 0.7 : 1}
                    onPress={hasDetails ? () => toggleToolCallExpanded(tc.id) : undefined}
                    style={[
                      styles.toolCallPill,
                      {
                        backgroundColor: isDark ? '#1C271E' : '#E9F5EB',
                        borderColor: isDark ? '#2D5E37' : '#BEE2C7',
                      },
                    ]}>
                    {tc.status === 'pending' ? (
                      <ActivityIndicator size="small" color={isDark ? '#94C7A0' : '#2D7543'} />
                    ) : (
                      <CheckmarkIcon size={14} color={isDark ? '#94C7A0' : '#2D7543'} />
                    )}
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.toolCallText,
                        {
                          color: isDark ? '#94C7A0' : '#2D7543',
                          fontFamily: monoFont,
                          maxWidth: 240,
                        },
                      ]}>
                      {tc.status === 'pending' ? `${label}...` : label}
                    </Text>
                    {hasDetails && (
                      <ChevronDownIcon size={10} color={isDark ? '#94C7A0' : '#2D7543'} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && hasDetails && (
                    <View
                      style={[
                        styles.toolDetailsCard,
                        {
                          backgroundColor: isDark ? '#151D16' : '#F0F8F2',
                          borderColor: isDark ? '#2D5E37' : '#BEE2C7',
                        },
                      ]}>
                      {sourceUrl && (
                        <Text
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[
                            styles.toolDetailsText,
                            { color: theme.textSecondary, fontFamily: monoFont },
                          ]}>
                          Source: {sourceUrl}
                        </Text>
                      )}
                      {cleanResult && (
                        <Text
                          numberOfLines={4}
                          ellipsizeMode="tail"
                          style={[
                            styles.toolDetailsResultText,
                            { color: isDark ? '#35D6B4' : '#1A6B3D', fontFamily: monoFont },
                          ]}>
                          ➜ {cleanResult}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Bot Thought Process */}
        {!isUser && hasThoughts && (
          <BotThoughtAccordion
            thoughts={thoughts}
            isStreaming={isStreaming && isLastItem}
            theme={theme}
            isDark={isDark}
            monoFont={monoFont}
          />
        )}

        {/* Chat Bubble */}
        {isUser ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleEditMessage(item.text)}
            style={[
              styles.messageBubble,
              styles.userBubble,
              { backgroundColor: isDark ? '#22251F' : '#E8E7DF' },
            ]}>
            {item.attachment && (
              <View style={{ marginBottom: 6 }}>
                {item.attachment.type.startsWith('image/') ? (
                  <Image source={{ uri: item.attachment.uri }} style={styles.bubbleImageAttachment} resizeMode="cover" />
                ) : (
                  <View style={[styles.bubbleDocAttachment, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
                    <PaperclipIcon size={16} color={theme.textPrimary} />
                    <Text numberOfLines={1} style={[styles.bubbleDocName, { color: theme.textPrimary }]}>
                      {item.attachment.name}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <Text
              style={[
                styles.messageText,
                { color: theme.textPrimary, fontFamily: monoFont },
              ]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        ) : hasResponseText ? (
          <View
            style={[
              styles.messageBubble,
              styles.botBubble,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}>
            {botSources.length > 0 && (
              <ChatSourcesBar
                sources={botSources}
                theme={theme}
                isDark={isDark}
              />
            )}
            <MarkdownRenderer content={cleanResponseText} theme={theme} />
          </View>
        ) : isWaitingForFirstOutput ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 4 }}>
            <TypingIndicator theme={theme} />
          </View>
        ) : null}

        {isUser && (
          <View style={styles.botUserActionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Copy"
              activeOpacity={0.6}
              onPress={() => NativeClipboard.setString(item.text)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtnSmall}>
              <CopyIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit"
              activeOpacity={0.6}
              onPress={() => handleEditMessage(item.text)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.actionBtnSmall, { marginLeft: 10 }]}>
              <PencilIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {!isUser && hasResponseText && (
          <View style={styles.botUserActionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Copy bot answer"
              activeOpacity={0.6}
              onPress={() => NativeClipboard.setString(responseText)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionBtnSmall}>
              <CopyIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
