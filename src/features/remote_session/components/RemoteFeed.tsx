import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshIcon,
  RemoteIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import {
  CliColors,
  MarkdownRenderer,
} from '../../chat/components/MarkdownRenderer';
import { TypingIndicator } from '../../chat/components/TypingIndicator';
import type { RemoteEntry, ToolCall } from '../relay/protocol';
import {
  FeedItem,
  buildFeed,
  describeTool,
  summarizeTools,
} from '../relay/feed';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const NEAR_BOTTOM_PX = 160;

interface Props {
  entries: RemoteEntry[];
  isWorking: boolean;
  canResend: boolean;
  theme: ThemeColors;
  keyboardHeight?: number;
  onCopy: (text: string) => void;
  onResend: (text: string) => void;
  onOpenTool: (tool: ToolCall) => void;
}

export function RemoteFeed({
  entries,
  isWorking,
  canResend,
  theme,
  keyboardHeight,
  onCopy,
  onResend,
  onOpenTool,
}: Props) {
  const listRef = useRef<FlatList<FeedItem>>(null);
  const nearBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const feed = useMemo(() => buildFeed(entries), [entries]);
  const cliColors = useMemo<CliColors>(
    () => ({
      inlineCode: theme.inlineCode,
      inlineCodeBackground: theme.inlineCodeBackground,
      link: theme.link,
    }),
    [theme],
  );

  const toggleGroup = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isNear =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - NEAR_BOTTOM_PX;
    nearBottom.current = isNear;
    setShowJump(prev => (prev === !isNear ? prev : !isNear));
  }, []);

  // Follow new output while near bottom or when Puku is actively working/streaming
  const onContentSizeChange = useCallback(() => {
    if (nearBottom.current || isWorking) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [isWorking]);

  // Scroll to bottom when keyboard opens so Puku's writing is never obscured
  React.useEffect(() => {
    if (keyboardHeight && keyboardHeight > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 60);
    }
  }, [keyboardHeight]);

  const last = entries[entries.length - 1];
  const showTyping =
    isWorking && !(last?.kind === 'assistant' && last.streaming);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedRow
        item={item}
        isExpanded={expanded.has(item.id)}
        canResend={canResend}
        theme={theme}
        cliColors={cliColors}
        onCopy={onCopy}
        onResend={onResend}
        onOpenTool={onOpenTool}
        onToggleGroup={toggleGroup}
      />
    ),
    [
      expanded,
      canResend,
      theme,
      cliColors,
      onCopy,
      onResend,
      onOpenTool,
      toggleGroup,
    ],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={feed}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        extraData={expanded}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={100}
        onContentSizeChange={onContentSizeChange}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.pillBackground },
              ]}
            >
              <RemoteIcon size={24} color={theme.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              Laptop connected
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: theme.textSecondary }]}
            >
              Ask Puku to do something on your laptop.
            </Text>
          </View>
        }
        ListFooterComponent={
          showTyping ? (
            <View style={styles.typing}>
              <TypingIndicator theme={theme} />
            </View>
          ) : undefined
        }
      />
      {showJump && (
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest"
          onPress={() => listRef.current?.scrollToEnd({ animated: true })}
          style={[
            styles.jump,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.outline,
            },
          ]}
        >
          <ChevronDownIcon size={18} color={theme.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface RowProps {
  item: FeedItem;
  isExpanded: boolean;
  canResend: boolean;
  theme: ThemeColors;
  cliColors: CliColors;
  onCopy: (text: string) => void;
  onResend: (text: string) => void;
  onOpenTool: (tool: ToolCall) => void;
  onToggleGroup: (id: string) => void;
}

const FeedRow = memo(function FeedRowView({
  item,
  isExpanded,
  canResend,
  theme,
  cliColors,
  onCopy,
  onResend,
  onOpenTool,
  onToggleGroup,
}: RowProps) {
  switch (item.kind) {
    case 'user':
      return (
        <View style={styles.userRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            delayLongPress={200}
            onLongPress={() => onCopy(item.text)}
            style={[styles.userBubble, { backgroundColor: theme.userBubble }]}
          >
            <Text
              selectable
              style={[styles.userText, { color: theme.onUserBubble }]}
            >
              {item.text}
            </Text>
          </TouchableOpacity>
          <View style={styles.userActions}>
            <TouchableOpacity
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Copy message"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => onCopy(item.text)}
            >
              <CopyIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
            {canResend && (
              <TouchableOpacity
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Send this message again"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => onResend(item.text)}
              >
                <RefreshIcon size={14} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );

    case 'tools': {
      const tools = item.tools.map(t => t.tool);
      const running = tools.some(t => t.status === 'running');
      const failed = tools.some(t => t.status === 'error');
      return (
        <View style={styles.toolGroup}>
          <TouchableOpacity
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            onPress={() => onToggleGroup(item.id)}
            style={styles.toolGroupHeader}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.toolGroupText,
                { color: failed ? theme.error : theme.textSecondary },
              ]}
            >
              {summarizeTools(tools)}
              {running ? '…' : ''}
            </Text>
            {isExpanded ? (
              <ChevronDownIcon size={13} color={theme.textSecondary} />
            ) : (
              <ChevronRightIcon size={14} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
          {isExpanded && (
            <View style={[styles.toolList, { borderLeftColor: theme.outline }]}>
              {item.tools.map(({ id, tool }) => (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityHint="Shows the command and its output"
                  onPress={() => onOpenTool(tool)}
                  style={styles.toolRow}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.toolRowText,
                      {
                        color:
                          tool.status === 'error'
                            ? theme.error
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {describeTool(tool)}
                  </Text>
                  <ChevronRightIcon size={14} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    }

    case 'system':
      return (
        <View style={styles.systemRow}>
          <View
            style={[
              styles.systemPill,
              { backgroundColor: theme.pillBackground },
            ]}
          >
            <Text
              style={[
                styles.systemText,
                {
                  color:
                    item.tone === 'error' ? theme.error : theme.textSecondary,
                },
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );

    case 'assistant':
      return (
        <View style={styles.assistantRow}>
          <MarkdownRenderer
            content={item.text}
            theme={theme}
            cliColors={cliColors}
          />
        </View>
      );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    paddingHorizontal: 28,
    lineHeight: 18,
  },
  typing: {
    marginVertical: 4,
    paddingLeft: 4,
  },
  jump: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  userRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  userBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  userText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingRight: 4,
  },
  toolGroup: {
    paddingHorizontal: 4,
    marginVertical: 2,
  },
  toolGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
  },
  toolGroupText: {
    fontSize: 14,
  },
  toolList: {
    borderLeftWidth: 1,
    marginLeft: 4,
    paddingLeft: 10,
    marginBottom: 4,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  toolRowText: {
    fontSize: 12.5,
    flex: 1,
    marginRight: 8,
    fontFamily: monoFont,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemPill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '90%',
  },
  systemText: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  assistantRow: {
    width: '100%',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
});
