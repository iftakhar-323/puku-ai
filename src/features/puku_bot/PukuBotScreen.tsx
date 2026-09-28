import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BotIcon,
  CopyIcon,
  MoonIcon,
  PencilIcon,
  SidebarToggleIcon,
  SunIcon,
  TerminalPromptIcon,
  UpArrowIcon,
} from '../../components/common/Icons';
import { NativeClipboard } from '../../services/nativeModules';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * PUKU BOT CONFIGURATION HOOK
 * ══════════════════════════════════════════════════════════════════════════
 * Note: Puku Bot backend is being configured by the team.
 * You can easily point this endpoint to your custom webhook, LLM server,
 * or custom Bot API when ready!
 */
export const PUKU_BOT_CONFIG = {
  name: 'Puku Bot',
  version: '1.0.0',
  customApiUrl: '', // e.g. 'https://your-bot-backend.example.com/api/chat'
  apiKey: '',
  defaultPersonality: 'fun', // 'fun' | 'fast' | 'deep'
};

type BotMode = 'fun' | 'fast' | 'deep';

interface BotMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  mode?: BotMode;
}

const STARTER_PROMPTS = [
  { label: 'Roast my tech stack', prompt: 'Roast my latest tech stack with pure honesty.' },
  { label: 'Quantum computing', prompt: 'Explain quantum computing simply, but make it funny.' },
  { label: 'AI news tea ☕', prompt: 'What is the absolute wildest drama happening in AI right now?' },
  { label: 'Zero-BS Linux tip', prompt: 'Give me a zero-bullshit Linux command tip every dev should know.' },
];

export function PukuBotScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, updateSettings, setDrawerOpen, navigate } = useApp();
  const [selectedMode, setSelectedMode] = useState<BotMode>('fun');
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  // Automatically scroll to bottom when keyboard opens
  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
    }
  }, [keyboardHeight]);

  const handleEditMessage = (text: string) => {
    setInputVal(text);
    inputRef.current?.focus();
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generatePukuBotResponse = (userPrompt: string, mode: BotMode): string => {
    const lower = userPrompt.toLowerCase();

    if (mode === 'fun') {
      if (lower.includes('roast') || lower.includes('stack')) {
        return "Oh, another full-stack developer who just discovered Tailwind and thinks they're reinventing computing? Let me guess: you're wrapping everything in 40 layers of microservices just to render a hello world button. Don't worry, your AWS bill will roast you better than I ever could! 🔥";
      }
      if (lower.includes('quantum')) {
        return "Think of quantum computing like this: regular computers are like a light switch—it's either on or off. Quantum computers are like a cat that is both knocking your coffee mug off the desk and NOT knocking it off, until you look at the carpet. Superposition, baby! 🐱⚡";
      }
      if (lower.includes('drama') || lower.includes('ai')) {
        return "The AI world right now is just trillion-dollar companies burning small countries' worth of electricity arguing about whether a chatbot is sentient or just really good at predicting the next word. Meanwhile, we're all still asking it to fix our regex! 🍿";
      }
      return `[Puku Bot 🔥 Fun Mode]\n\nYou asked: "${userPrompt}"\n\nHere's the unfiltered truth: computers do exactly what you tell them to do, which is usually the exact opposite of what you wanted them to do. Keep cooking, but check your syntax first!`;
    }

    if (mode === 'fast') {
      return `⚡ Quick Puku Answer:\n\nDirect summary for: "${userPrompt}".\n1. Keep it minimal and performant.\n2. Verify input constraints.\n3. Execute with zero bloat.`;
    }

    // deep reason
    return `🧠 [Deep Reasoning Analysis]\n\nPrompt: "${userPrompt}"\n\n• Premise Evaluation: Validated core thesis.\n• First-Principles Breakdown:\n  1. Underlying architecture constraints\n  2. Algorithmic complexity and trade-offs\n  3. Recommended implementation path\n\nResult: Proceed with pragmatic modularity.`;
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isTyping) return;

    const userMsg: BotMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: 'Just now',
      mode: selectedMode,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Simulate smart Bot stream / response
    setTimeout(() => {
      const botReply = generatePukuBotResponse(query, selectedMode);
      const botMsg: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: botReply,
        timestamp: 'Just now',
        mode: selectedMode,
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }, 600);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom:
            Platform.OS === 'android'
              ? (keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 12))
              : Math.max(insets.bottom, 12),
        },
      ]}>
      {/* Authentic Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDrawerOpen(true)}
          style={styles.actionBtn}>
          <SidebarToggleIcon size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.screenTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            puku bot
          </Text>
          <View style={[styles.badge, { backgroundColor: isDark ? '#262925' : '#E4E5DB' }]}>
            <Text style={[styles.badgeText, { color: isDark ? '#35D6B4' : '#1A1D18', fontFamily: monoFont }]}>
              AI
            </Text>
          </View>
        </View>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('code')}
            style={styles.actionBtn}>
            <TerminalPromptIcon size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('chat')}
            style={[styles.actionBtn, styles.activeBotBtn, { backgroundColor: isDark ? '#262925' : '#E4E5DB' }]}>
            <BotIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
            style={styles.actionBtn}>
            {isDark ? (
              <SunIcon size={20} color={theme.textPrimary} />
            ) : (
              <MoonIcon size={20} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Selector Tabs (Fun / Fast / Deep) */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSelectedMode('fun')}
          style={[
            styles.modePill,
            selectedMode === 'fun' && {
              backgroundColor: isDark ? '#2E2818' : '#FCEFD8',
              borderColor: '#E8B187',
            },
          ]}>
          <Text
            style={[
              styles.modePillText,
              {
                color: selectedMode === 'fun' ? '#E8B187' : theme.textMuted,
                fontFamily: monoFont,
              },
            ]}>
            🔥 Fun Mode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSelectedMode('fast')}
          style={[
            styles.modePill,
            selectedMode === 'fast' && {
              backgroundColor: isDark ? '#1C271E' : '#E0F3E5',
              borderColor: '#94C7A0',
            },
          ]}>
          <Text
            style={[
              styles.modePillText,
              {
                color: selectedMode === 'fast' ? (isDark ? '#94C7A0' : '#2D7543') : theme.textMuted,
                fontFamily: monoFont,
              },
            ]}>
            ⚡ Fast Mode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSelectedMode('deep')}
          style={[
            styles.modePill,
            selectedMode === 'deep' && {
              backgroundColor: isDark ? '#1F2038' : '#E6E7FD',
              borderColor: '#B0B3FC',
            },
          ]}>
          <Text
            style={[
              styles.modePillText,
              {
                color: selectedMode === 'deep' ? (isDark ? '#B0B3FC' : '#484DD0') : theme.textMuted,
                fontFamily: monoFont,
              },
            ]}>
            🧠 Deep Reason
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages or Empty State */}
      {messages.length === 0 ? (
        <View style={styles.emptyHeroContainer}>
          <View style={[styles.avatarGlow, { backgroundColor: isDark ? '#1C1D1A' : '#FAF6EC', borderColor: theme.border }]}>
            <BotIcon size={44} color={theme.textPrimary} />
          </View>

          <Text style={[styles.heroHeadline, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Puku Bot
          </Text>
          <Text style={[styles.heroSubhead, { color: theme.textSecondary, fontFamily: monoFont }]}>
            Direct, candid, and unrestricted reasoning AI assistant.
          </Text>

          <View style={[styles.statusNotice, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.statusNoticeText, { color: theme.textMuted, fontFamily: monoFont }]}>
              {PUKU_BOT_CONFIG.customApiUrl
                ? `● Connected: ${PUKU_BOT_CONFIG.customApiUrl}`
                : '● Standby • Local reasoning ready. Plug in your custom backend anytime.'}
            </Text>
          </View>

          {/* Prompt Chips */}
          <Text style={[styles.promptChipsTitle, { color: theme.textMuted, fontFamily: monoFont }]}>
            Try asking:
          </Text>
          <View style={styles.chipsWrap}>
            {STARTER_PROMPTS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => handleSend(item.prompt)}
                style={[styles.chipBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={[styles.chipText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {item.label} ↗
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.chatArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.flatList}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
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
                  <View style={{ maxWidth: '82%' }}>
                    <TouchableOpacity
                      activeOpacity={isUser ? 0.85 : 1}
                      onLongPress={isUser ? () => handleEditMessage(item.text) : undefined}
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: isDark ? '#22251F' : '#E8E7DF' }]
                          : [styles.botBubble, { backgroundColor: theme.cardBackground, borderColor: theme.border }],
                      ]}>
                      <Text
                        style={[
                          styles.messageText,
                          { color: theme.textPrimary, fontFamily: monoFont },
                        ]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                    {isUser && (
                      <View style={styles.botUserActionRow}>
                        <TouchableOpacity
                          activeOpacity={0.6}
                          onPress={() => NativeClipboard.setString(item.text)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.actionBtnSmall}>
                          <CopyIcon size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.6}
                          onPress={() => handleEditMessage(item.text)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={[styles.actionBtnSmall, { marginLeft: 10 }]}>
                          <PencilIcon size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              isTyping ? (
                <View style={styles.typingIndicatorRow}>
                  <Text style={[styles.typingText, { color: theme.textMuted, fontFamily: monoFont }]}>
                    Puku Bot is typing...
                  </Text>
                </View>
              ) : undefined
            }
          />
        </View>
      )}

      {/* Bottom Composer */}
      <View
        style={[
          styles.composerCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}>
        <TextInput
          ref={inputRef}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder="Ask Puku Bot anything (no filter)..."
          placeholderTextColor={theme.placeholderText}
          multiline
          style={[styles.composerInput, { color: theme.textPrimary, fontFamily: monoFont }]}
        />

        <View style={styles.composerBottomRow}>
          <View style={styles.composerLeftMeta}>
            <View style={[styles.modeIndicatorTag, { borderColor: theme.border }]}>
              <Text style={[styles.modeIndicatorText, { color: theme.textMuted, fontFamily: monoFont }]}>
                {selectedMode === 'fun' ? '🔥 Fun Mode' : selectedMode === 'fast' ? '⚡ Fast' : '🧠 Deep'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!inputVal.trim() || isTyping}
            onPress={() => handleSend()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputVal.trim()
                  ? (isDark ? '#E4E8E2' : '#1A1D18')
                  : (isDark ? '#262925' : '#E4E5DB'),
              },
            ]}>
            <UpArrowIcon
              size={18}
              color={inputVal.trim() ? (isDark ? '#141613' : '#FFFFFF') : theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeBotBtn: {
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyHeroContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroHeadline: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubhead: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusNotice: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  statusNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  promptChipsTitle: {
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  botSmallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
  },
  userBubble: {
    borderRadius: 14,
  },
  botBubble: {
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  typingIndicatorRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  chatArea: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  botUserActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  actionBtnSmall: {
    padding: 4,
  },
  composerCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
  },
  composerInput: {
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    padding: 0,
    marginBottom: 8,
  },
  composerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerLeftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIndicatorTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeIndicatorText: {
    fontSize: 11,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
