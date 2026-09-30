import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  BotIcon,
  CheckmarkIcon,
  CloseIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MoonIcon,
  PencilIcon,
  RefreshIcon,
  SettingsIcon,
  SidebarToggleIcon,
  SunIcon,
  TerminalPromptIcon,
  UpArrowIcon,
} from '../../components/common/Icons';
import { ENV } from '../../config/env';
import { NativeClipboard } from '../../services/nativeModules';
import { pukuBotApi } from '../../services/pukuBotApi';
import { useApp } from '../../store/AppContext';
import {
  PukuBotComputerInfo,
  PukuBotConversation,
  PukuBotItem,
  PukuBotMessage,
  PukuBotToolCall,
  PukuBotTurnEvent,
  PukuBotUser,
} from '../../types';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

type BotMode = 'fun' | 'fast' | 'deep';

interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  mode?: BotMode;
  toolCalls?: PukuBotToolCall[];
}

interface NeedsPersonState {
  kind: 'help' | 'secret';
  botId?: string;
  reason?: string;
  label?: string;
}

const STARTER_PROMPTS = [
  { label: 'Roast my tech stack', prompt: 'Roast my latest tech stack with pure honesty.' },
  { label: 'Quantum computing', prompt: 'Explain quantum computing simply, but make it funny.' },
  { label: 'AI news tea ☕', prompt: 'What is the absolute wildest drama happening in AI right now?' },
  { label: 'Zero-BS Linux tip', prompt: 'Give me a zero-bullshit Linux command tip every dev should know.' },
];

function ComputerMonitorIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="1.75" />
      <Path d="M8 21H16" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <Path d="M12 17V21" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </Svg>
  );
}

function StopSquareIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="5" width="14" height="14" rx="2" fill={color} />
    </Svg>
  );
}

export function PukuBotScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, updateSettings, setDrawerOpen, navigate } = useApp();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  // UI state
  const [selectedMode, setSelectedMode] = useState<BotMode>('fun');
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Puku Bot API (v1) state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [botUser, setBotUser] = useState<PukuBotUser | null>(null);
  const [availableBots, setAvailableBots] = useState<PukuBotItem[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('general-assistant');
  const [activeConversation, setActiveConversation] = useState<PukuBotConversation | null>(null);

  // Human-in-the-loop (needs_person) state
  const [needsPerson, setNeedsPerson] = useState<NeedsPersonState | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [isSecretMasked, setIsSecretMasked] = useState(true);
  const [isSubmittingSecret, setIsSubmittingSecret] = useState(false);

  // Computer screen / status modal state
  const [showComputerModal, setShowComputerModal] = useState(false);
  const [computerInfo, setComputerInfo] = useState<PukuBotComputerInfo | null>(null);
  const [isLoadingComputer, setIsLoadingComputer] = useState(false);
  const [screenshotTimestamp, setScreenshotTimestamp] = useState<number>(Date.now());
  const [isTakingControl, setIsTakingControl] = useState(false);

  // Settings / Connection modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(pukuBotApi.getBaseUrl());
  const [isConnectingAuth, setIsConnectingAuth] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);
  const activeStreamAbortRef = useRef<(() => void) | null>(null);
  const { keyboardHeight } = useKeyboardHeight();

  // Scroll to bottom on keyboard or new messages
  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [keyboardHeight]);

  // Initialize Puku Bot API
  useEffect(() => {
    let isMounted = true;

    async function initApi() {
      await pukuBotApi.init();
      if (!isMounted) return;

      const authed = pukuBotApi.isAuthenticated();
      setIsAuthenticated(authed);
      setBotUser(pukuBotApi.getUser());
      setCustomApiUrl(pukuBotApi.getBaseUrl());

      if (authed) {
        try {
          const [bots, me] = await Promise.all([
            pukuBotApi.getBots().catch(() => []),
            pukuBotApi.getMe().catch(() => null),
          ]);
          if (!isMounted) return;

          if (bots.length > 0) {
            setAvailableBots(bots);
            setSelectedBotId(bots[0].id);
          }
          if (me) {
            setBotUser(me);
          }

          // Load conversations and messages
          await loadActiveConversation(bots[0]?.id || 'general-assistant');
        } catch (e) {
          console.warn('[PukuBotScreen] API load error:', e);
        }
      }
    }

    initApi();

    const unsubscribe = pukuBotApi.onAuthChange(user => {
      if (!isMounted) return;
      setIsAuthenticated(pukuBotApi.isAuthenticated());
      setBotUser(user);
      if (pukuBotApi.isAuthenticated()) {
        initApi();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (activeStreamAbortRef.current) {
        activeStreamAbortRef.current();
      }
    };
  }, []);

  const loadActiveConversation = async (botId: string) => {
    try {
      const convList = await pukuBotApi.getConversations(5);
      let targetConv = convList.conversations.find(c => c.botId === botId);

      if (!targetConv) {
        targetConv = await pukuBotApi.createConversation(botId);
      }

      setActiveConversation(targetConv);

      if (targetConv) {
        const msgRes = await pukuBotApi.getMessages(targetConv.id, 50);
        const mapped: LocalChatMessage[] = msgRes.messages.map(m => ({
          id: m.id,
          role: m.role,
          text: m.text,
          toolCalls: m.toolCalls,
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.warn('[PukuBotScreen] Load conversation error:', err);
    }
  };

  const handleEditMessage = (text: string) => {
    setInputVal(text);
    inputRef.current?.focus();
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Local reasoning fallback for Standby / Offline mode
  const generateLocalPukuBotResponse = (userPrompt: string, mode: BotMode): string => {
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

  // Handle Send: Live Puku Bot API (v1) streaming OR Local Fallback
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isTyping || isStreaming) return;

    const userMsg: LocalChatMessage = {
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

    // If connected to official Puku Bot API, stream via SSE
    if (isAuthenticated && activeConversation) {
      setIsStreaming(true);

      const assistantMsgId = (Date.now() + 1).toString();
      let currentAssistantText = '';
      const currentToolCalls: PukuBotToolCall[] = [];

      // Create placeholder assistant message
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          timestamp: 'Just now',
          toolCalls: [],
        },
      ]);

      const streamHandle = pukuBotApi.sendMessageStream(
        activeConversation.id,
        query,
        [],
        (event: PukuBotTurnEvent) => {
          switch (event.type) {
            case 'message.delta':
              if (event.delta) {
                currentAssistantText += event.delta;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, text: currentAssistantText, toolCalls: [...currentToolCalls] }
                      : m
                  )
                );
              }
              break;

            case 'message.completed':
              if (event.text) {
                currentAssistantText = event.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, text: currentAssistantText, toolCalls: [...currentToolCalls] }
                      : m
                  )
                );
              }
              break;

            case 'tool.started':
              if (event.name && event.toolCallId) {
                currentToolCalls.push({
                  id: event.toolCallId,
                  name: event.name,
                  arguments: event.arguments || {},
                  status: 'pending',
                });
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, toolCalls: [...currentToolCalls] } : m
                  )
                );
              }
              break;

            case 'tool.completed':
              if (event.toolCallId) {
                const existing = currentToolCalls.find(tc => tc.id === event.toolCallId);
                if (existing) {
                  existing.status = 'completed';
                  existing.result = event.result;
                }
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, toolCalls: [...currentToolCalls] } : m
                  )
                );
              }
              break;

            case 'needs_person':
              setNeedsPerson({
                kind: event.kind || 'help',
                botId: event.botId || selectedBotId,
                reason: event.reason,
                label: event.label,
              });
              break;

            case 'turn.completed':
              setIsTyping(false);
              setIsStreaming(false);
              activeStreamAbortRef.current = null;
              break;

            case 'turn.failed':
              setIsTyping(false);
              setIsStreaming(false);
              activeStreamAbortRef.current = null;
              if (event.message) {
                setMessages(prev => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: 'assistant',
                    text: `⚠️ Turn error: ${event.message}`,
                  },
                ]);
              }
              break;
          }
        }
      );

      activeStreamAbortRef.current = streamHandle.abort;
    } else {
      // Local Standby fallback mode
      setTimeout(() => {
        const botReply = generateLocalPukuBotResponse(query, selectedMode);
        const botMsg: LocalChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
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
    }
  };

  const handleStopStream = () => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current();
      activeStreamAbortRef.current = null;
    }
    setIsStreaming(false);
    setIsTyping(false);
  };

  // Submit sensitive secret requested by bot (needs_person: kind="secret")
  const handleSubmitSecret = async () => {
    if (!secretInput.trim() || !needsPerson?.botId) return;
    setIsSubmittingSecret(true);
    try {
      await pukuBotApi.sendComputerSecret(needsPerson.botId, secretInput.trim());
      setSecretInput('');
      setNeedsPerson(null);
      Alert.alert('Secret Transmitted', 'Value sent securely to the Bot computer.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit secret');
    } finally {
      setIsSubmittingSecret(false);
    }
  };

  // Load Bot computer status
  const handleOpenComputerModal = async () => {
    setShowComputerModal(true);
    setIsLoadingComputer(true);
    setScreenshotTimestamp(Date.now());
    try {
      const info = await pukuBotApi.getComputer(selectedBotId);
      setComputerInfo(info);
    } catch (err: any) {
      console.warn('[PukuBotScreen] getComputer error:', err);
    } finally {
      setIsLoadingComputer(false);
    }
  };

  const handleToggleControl = async () => {
    if (!selectedBotId) return;
    setIsTakingControl(true);
    try {
      const isHuman = computerInfo?.control?.holder === 'human';
      if (isHuman) {
        const res = await pukuBotApi.releaseComputerControl(selectedBotId);
        setComputerInfo(prev => (prev ? { ...prev, control: res.control } : prev));
      } else {
        const res = await pukuBotApi.takeComputerControl(selectedBotId);
        setComputerInfo(prev => (prev ? { ...prev, control: res.control } : prev));
      }
      setScreenshotTimestamp(Date.now());
    } catch (err: any) {
      Alert.alert('Control Error', err.message || 'Failed to toggle computer control');
    } finally {
      setIsTakingControl(false);
    }
  };

  // Start PKCE Sign-In
  const handleConnectAuth = async () => {
    setIsConnectingAuth(true);
    try {
      await pukuBotApi.setBaseUrl(customApiUrl);
      await pukuBotApi.startAuth();
      setShowSettingsModal(false);
    } catch (err: any) {
      Alert.alert('Sign-In Error', err.message || 'Could not start OAuth flow');
    } finally {
      setIsConnectingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await pukuBotApi.signOut();
    setIsAuthenticated(false);
    setBotUser(null);
    setMessages([]);
    setActiveConversation(null);
    setShowSettingsModal(false);
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
              {isAuthenticated ? (availableBots[0]?.name || 'LIVE') : 'AI'}
            </Text>
          </View>
        </View>

        <View style={styles.trailingGroup}>
          {isAuthenticated && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenComputerModal}
              style={[styles.actionBtn, styles.computerBtn, { backgroundColor: isDark ? '#1C271E' : '#E0F3E5' }]}>
              <ComputerMonitorIcon size={18} color={isDark ? '#94C7A0' : '#2D7543'} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSettingsModal(true)}
            style={styles.actionBtn}>
            <SettingsIcon size={19} color={theme.textSecondary} />
          </TouchableOpacity>

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

      {/* Human-in-the-loop (needs_person) Alert Banner */}
      {needsPerson && (
        <View
          style={[
            styles.needsPersonBanner,
            {
              backgroundColor: isDark ? '#2A2010' : '#FFF9E6',
              borderColor: isDark ? '#C79A40' : '#E0A830',
            },
          ]}>
          <View style={styles.needsPersonHeader}>
            <Text style={[styles.needsPersonTitle, { color: isDark ? '#F5D070' : '#A36800', fontFamily: monoFont }]}>
              {needsPerson.kind === 'secret' ? '🔐 Secret Needed' : '⚠️ Assistance Needed'}
            </Text>
            <TouchableOpacity onPress={() => setNeedsPerson(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={16} color={isDark ? '#F5D070' : '#A36800'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.needsPersonReason, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {needsPerson.reason || (needsPerson.kind === 'secret' ? 'Bot requests a sensitive credential' : 'Bot requests human intervention on its computer')}
          </Text>

          {needsPerson.kind === 'secret' ? (
            <View style={styles.secretInputRow}>
              <View style={[styles.secretBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                <TextInput
                  secureTextEntry={isSecretMasked}
                  value={secretInput}
                  onChangeText={setSecretInput}
                  placeholder={needsPerson.label || 'Enter requested secret...'}
                  placeholderTextColor={theme.placeholderText}
                  style={[styles.secretTextInput, { color: theme.textPrimary, fontFamily: monoFont }]}
                />
                <TouchableOpacity onPress={() => setIsSecretMasked(!isSecretMasked)} style={styles.eyeBtn}>
                  {isSecretMasked ? (
                    <EyeIcon size={18} color={theme.textMuted} />
                  ) : (
                    <EyeOffIcon size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                disabled={!secretInput.trim() || isSubmittingSecret}
                onPress={handleSubmitSecret}
                style={[
                  styles.secretSubmitBtn,
                  { backgroundColor: isDark ? '#35D6B4' : '#1A1D18', opacity: secretInput.trim() ? 1 : 0.5 },
                ]}>
                {isSubmittingSecret ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.secretSubmitText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.needsPersonActions}>
              <TouchableOpacity
                onPress={handleOpenComputerModal}
                style={[styles.needsPersonBtn, { backgroundColor: isDark ? '#3E3420' : '#F4E5BE' }]}>
                <Text style={[styles.needsPersonBtnText, { color: isDark ? '#F5D070' : '#8A5800', fontFamily: monoFont }]}>
                  View Screen
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleControl}
                style={[styles.needsPersonBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                <Text style={[styles.needsPersonBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                  Take Control
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowSettingsModal(true)}
            style={[styles.statusNotice, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.statusNoticeText, { color: theme.textMuted, fontFamily: monoFont }]}>
              {isAuthenticated
                ? `● Connected: ${botUser?.email || 'Official Puku Bot API (v1)'}`
                : '● Standby • Local reasoning ready. Tap to connect Puku Bot backend.'}
            </Text>
          </TouchableOpacity>

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
                  <View style={{ maxWidth: '84%' }}>
                    {/* Tool execution indicators */}
                    {!isUser && item.toolCalls && item.toolCalls.length > 0 && (
                      <View style={styles.toolCallsContainer}>
                        {item.toolCalls.map((tc: PukuBotToolCall) => (
                          <View
                            key={tc.id}
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
                              style={[
                                styles.toolCallText,
                                {
                                  color: isDark ? '#94C7A0' : '#2D7543',
                                  fontFamily: monoFont,
                                },
                              ]}>
                              {tc.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

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
                        {item.text || (isStreaming ? 'Thinking...' : '')}
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
              isTyping && !isStreaming ? (
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
          placeholder="Ask Puku Bot anything..."
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

          {isStreaming ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStopStream}
              style={[styles.sendBtn, { backgroundColor: '#FF4D4F' }]}>
              <StopSquareIcon size={14} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
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
          )}
        </View>
      </View>

      {/* Computer Screen / Status Modal */}
      <Modal
        visible={showComputerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComputerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ComputerMonitorIcon size={20} color={theme.textPrimary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  Bot Computer
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowComputerModal(false)}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingVertical: 12 }}>
              {/* Computer Status Bar */}
              <View style={[styles.computerStatusBar, { borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          computerInfo?.status?.state === 'ready'
                            ? '#35D6B4'
                            : computerInfo?.status?.state === 'starting'
                            ? '#FFB020'
                            : '#8E9297',
                      },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                    State: {computerInfo?.status?.state || 'Unknown'}
                  </Text>
                </View>

                <Text style={[styles.statusText, { color: theme.textMuted, fontFamily: monoFont }]}>
                  Control: {computerInfo?.control?.holder === 'human' ? 'You' : 'Bot'}
                </Text>
              </View>

              {/* Screen Preview */}
              <View style={[styles.screenFrame, { borderColor: theme.border, backgroundColor: isDark ? '#141613' : '#F0F0EB' }]}>
                {isLoadingComputer ? (
                  <View style={styles.screenLoader}>
                    <ActivityIndicator size="large" color={theme.textPrimary} />
                  </View>
                ) : (
                  <Image
                    source={{
                      uri: `${pukuBotApi.getScreenshotUrl(selectedBotId)}?t=${screenshotTimestamp}`,
                      headers: pukuBotApi.getToken()
                        ? { Authorization: `Bearer ${pukuBotApi.getToken()}` }
                        : undefined,
                    }}
                    style={styles.screenshotImage}
                    resizeMode="contain"
                  />
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.computerActionRow}>
                <TouchableOpacity
                  disabled={isTakingControl}
                  onPress={handleToggleControl}
                  style={[
                    styles.primaryActionBtn,
                    {
                      backgroundColor:
                        computerInfo?.control?.holder === 'human'
                          ? (isDark ? '#2E2818' : '#FCEFD8')
                          : (isDark ? '#1C271E' : '#E0F3E5'),
                      borderColor:
                        computerInfo?.control?.holder === 'human' ? '#E8B187' : '#94C7A0',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color:
                          computerInfo?.control?.holder === 'human'
                            ? '#E8B187'
                            : (isDark ? '#94C7A0' : '#2D7543'),
                        fontFamily: monoFont,
                      },
                    ]}>
                    {computerInfo?.control?.holder === 'human' ? 'Release Control' : 'Take Control'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setScreenshotTimestamp(Date.now())}
                  style={[styles.secondaryActionBtn, { borderColor: theme.border }]}>
                  <RefreshIcon size={16} color={theme.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                    Refresh
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings / Connection Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Puku Bot Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
                API BASE URL:
              </Text>

              <TextInput
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://app.bot.puku.sh/api/v1"
                placeholderTextColor={theme.placeholderText}
                style={[
                  styles.settingsInput,
                  { color: theme.textPrimary, borderColor: theme.border, fontFamily: monoFont },
                ]}
              />

              <View style={styles.quickEnvRow}>
                <TouchableOpacity
                  onPress={() => setCustomApiUrl(ENV.PUKU_BOT_API_BASE_URL)}
                  style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                  <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                    Cloud (Prod)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCustomApiUrl(ENV.PUKU_BOT_LOCAL_BASE_URL)}
                  style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                  <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                    Local (3001)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Account Status */}
              <View style={[styles.accountBox, { borderColor: theme.border }]}>
                {isAuthenticated ? (
                  <View>
                    <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                      Signed in as:
                    </Text>
                    <Text style={[styles.accountEmail, { color: theme.textSecondary, fontFamily: monoFont }]}>
                      {botUser?.email || 'Puku Bot User'}
                    </Text>

                    <TouchableOpacity
                      onPress={handleSignOut}
                      style={[styles.signOutBtn, { borderColor: '#FF4D4F' }]}>
                      <Text style={[styles.signOutText, { color: '#FF4D4F', fontFamily: monoFont }]}>
                        Sign Out
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                      Connect Puku Bot (v1)
                    </Text>
                    <Text style={[styles.accountDesc, { color: theme.textMuted, fontFamily: monoFont }]}>
                      Sign in with PKCE flow to access real-time computer tools, active agents, and synced web channels.
                    </Text>

                    <TouchableOpacity
                      disabled={isConnectingAuth}
                      onPress={handleConnectAuth}
                      style={[styles.signInBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                      {isConnectingAuth ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.signInBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                          Sign In with Puku Bot
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  computerBtn: {
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
  needsPersonBanner: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  needsPersonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  needsPersonTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  needsPersonReason: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  needsPersonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  needsPersonBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  needsPersonBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  secretInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secretBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  secretTextInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  secretSubmitBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretSubmitText: {
    fontSize: 12,
    fontWeight: '700',
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
  toolCallsContainer: {
    marginBottom: 6,
    gap: 4,
  },
  toolCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  toolCallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messageBubble: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  computerStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
  },
  screenFrame: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenLoader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  computerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  settingsInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
    marginBottom: 8,
  },
  quickEnvRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickEnvPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickEnvText: {
    fontSize: 11,
  },
  accountBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 12,
    marginBottom: 12,
  },
  accountDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  signInBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  signOutBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
