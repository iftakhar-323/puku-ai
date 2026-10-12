import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { useTranslation } from 'react-i18next';
import i18next from '../../i18n';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  ArrowUpRightIcon,
  BotIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  ConnectIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MoonIcon,
  PaperclipIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  PukuBotGradientIcon,
  PukuLogoIcon,
  PukuRemoteGradientIcon,
  RefreshIcon,
  RemoteIcon,
  SettingsIcon,
  SidebarToggleIcon,
  SparkleIcon,
  SunIcon,
  TerminalPromptIcon,
  TrashIcon,
  UpArrowIcon,
} from '../../components/common/Icons';
import { MediaPickerModal } from '../../components/common/MediaPickerModal';
import { ENV } from '../../config/env';
import { MarkdownRenderer } from '../chat/components/MarkdownRenderer';
import { TypingIndicator } from '../chat/components/TypingIndicator';
import {
  NativeClipboard,
  NativePicker,
  PickedMedia,
  promptMediaAttachment,
} from '../../services/nativeModules';
import { formatActivityDate } from '../../utils/date';
import { pukuBotApi } from '../../services/pukuBotApi';
import { tokenManager } from '../../services/tokenManager';
import { pukuApi, emitProgressively } from '../../services/api';
import { useApp } from '../../store/AppContext';
import { useRemoteSession } from '../../store/RemoteSessionContext';
import {
  PukuBotComputerInfo,
  PukuBotConnection,
  PukuBotConversation,
  PukuBotItem,
  PukuBotMemory,
  PukuBotRoutine,
  PukuBotSkill,
  PukuBotToolCall,
  PukuBotTurnEvent,
  PukuBotUser,
} from '../../types';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  toolCalls?: PukuBotToolCall[];
  attachment?: PickedMedia;
}

interface NeedsPersonState {
  kind: 'help' | 'secret';
  botId?: string;
  reason?: string;
  label?: string;
}

function getGreeting(userName?: string): { lead: string; name: string } {
  const h = new Date().getHours();
  let lead = i18next.t('chatEmptyState.greetingMorning');
  if (h >= 12 && h < 17) {
    lead = i18next.t('chatEmptyState.greetingAfternoon');
  } else if (h >= 17 && h < 22) {
    lead = i18next.t('chatEmptyState.greetingEvening');
  } else if (h >= 22 || h < 5) {
    lead = i18next.t('chatEmptyState.greetingLate');
  }

  let name = i18next.t('chatEmptyState.greetingFallbackName');
  if (userName?.trim()) {
    name = userName.trim().split(/\s+/)[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return { lead, name };
}

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
        label = cleanTopic ? `Wikipedia • ${cleanTopic}` : 'Wikipedia';
      } else {
        label = `Browsing ${host}`;
      }
    } catch {
      label = `Browsing ${rawUrl.slice(0, 30)}`;
    }
  } else if (name === 'computer_navigate' || name === 'navigate') {
    label = 'Browsing web';
  } else if (name === 'web_search' || name === 'search') {
    const query = args?.query || args?.q || '';
    label = query ? `Searching: "${query}"` : 'Web Search';
  } else if (name === 'execute_command' || name === 'bash') {
    label = 'Terminal command';
  } else {
    if (name.startsWith('computer_')) {
      const sub = name.replace('computer_', '').replace(/_/g, ' ');
      label = sub.charAt(0).toUpperCase() + sub.slice(1);
    } else {
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
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

function BotThoughtAccordion({
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
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        marginBottom: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: isDark ? 'rgba(176, 179, 252, 0.2)' : 'rgba(72, 77, 208, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.primaryLight || '#94C7A0',
              }}
            />
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary,
              fontFamily: monoFont,
            }}>
            {isStreaming ? 'Thinking...' : 'Thought process'}
          </Text>
        </View>
        {expanded ? (
          <ChevronDownIcon size={12} color={theme.textMuted} />
        ) : (
          <ChevronRightIcon size={12} color={theme.textMuted} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View
          style={{
            paddingHorizontal: 10,
            paddingBottom: 8,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          }}>
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              color: theme.textSecondary,
              fontFamily: monoFont,
            }}>
            {thoughts}
          </Text>
        </View>
      )}
    </View>
  );
}

export function generateIntelligentResponse(prompt: string, botId?: string): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // Greetings
  if (/^(hlw|hi|hello|hey|salam|assalamu|hola|good morning|good afternoon|good evening|yo)\b/i.test(lower)) {
    return "Hello! I'm Puku Bot, your autonomous AI assistant. How can I help you today? Whether you need assistance with software engineering, researching a topic, running data tasks, or brainstorming ideas, I'm ready to collaborate!";
  }

  // Dhaka / Bangladesh lifestyle & culture
  if (lower.includes('dhaka') || lower.includes('bangladesh')) {
    return `Life in Dhaka is dynamic, vibrant, and multifaceted. Here is an authentic look at everyday lifestyle in Dhaka:

### 🌆 Rhythm & Modern Pulse
- **Energy & Motion:** Dhaka is one of the most energetic megacities in the world. Street life is animated with hundreds of thousands of artfully decorated cycle rickshaws, auto-rickshaws, and modern public transit like the **Dhaka Metro Rail**.
- **Urban Contrast:** Old Dhaka (*Puran Dhaka*) preserves historic Mughal-era architectural charm and closely connected neighborhood culture, while modern commercial districts like Gulshan, Banani, and Uttara feature contemporary cafes, rooftop lounges, and tech offices.

### ☕ Social Life & Gastronomy
- **Adda Culture:** Evening discussions (*adda*) at roadside tea stalls (*tong*) over hot milk tea and biscuits are an iconic staple of daily life.
- **Iconic Flavors:** Renowned for Old Dhaka mutton and kacchi biryani (Haji, Nanna, Fakruddin), spicy fuchka and chotpoti around Dhanmondi Lake and TSC (Dhaka University), and seasonal delights like winter pithas.

### 💻 Tech & Innovation
- A rapidly growing tech startup and remote-work community, with developer hubs across Karwan Bazar, Mohakhali, and Mirpur powering digital commerce and services.`;
  }

  // Tech stack roast
  if (lower.includes('roast') && (lower.includes('stack') || lower.includes('tech'))) {
    return `Alright, let's look at that tech stack with pure honesty:

- **Frontend:** You chose React Native because you believed "write once, run anywhere," only to spend hours debugging why Android renders 2 pixels differently than iOS.
- **Backend:** Probably a Node or Bun server running 14 microservices that could have comfortably lived in a single clean monolith.
- **State Management:** You probably installed Redux, Zustand, and Context API just to pass a user profile down 2 component levels.
- **Database:** MongoDB because schemas felt restrictive, but now your document structure has 17 different inconsistent timestamp formats.

*Verdict: 8.5/10 on the caffeine-powered developer scale. If it ships to production and works for users, wear it with pride!* 🚀`;
  }

  // Code / Debugging / Programming
  if (/\b(debug|code|error|bug|issue|react|javascript|typescript|python|api|server|function|component)\b/i.test(lower)) {
    return `Here is a systematic approach to addressing **${p}**:

### 🔍 1. Root Cause Identification
- **State & Props Verification:** Verify that values passed to components or functions are not unexpectedly \`undefined\` or null.
- **Async Execution Timing:** Ensure all promises and network calls are properly awaited and wrapped in structured \`try / catch\` handlers.
- **Lifecycle & Dependency Arrays:** Check \`useEffect\` dependency arrays to prevent stale closures or unintended infinite re-renders.

### 🛠️ 2. Recommended Implementation
\`\`\`typescript
// Safe async handling pattern
async function safeExecute<T>(action: () => Promise<T>): Promise<[T | null, Error | null]> {
  try {
    const data = await action();
    return [data, null];
  } catch (err: any) {
    console.error('[Execution Error]:', err);
    return [null, err];
  }
}
\`\`\`

### 💡 3. Next Steps
Feel free to paste the exact error stack trace or code snippet here, and I'll analyze it step-by-step!`;
  }

  // General questions & knowledge
  return `### Analysis & Key Findings
Regarding your query on **"${p}"**:

1. **Overview:** This touches on core architectural and practical aspects that are essential for achieving reliable results.
2. **Key Considerations:**
   - **Structure & Modularity:** Break down larger challenges into small, verifiable milestones.
   - **Verification:** Test boundary conditions and validate assumptions early.
3. **Next Steps:** If you'd like me to expand on any specific aspect, draft code, or outline a detailed plan, please let me know!`;
}

export function PukuBotScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    theme,
    isDark,
    updateSettings,
    setDrawerOpen,
    navigate,
    botConversations,
    activeBotConversationId,
    activeBotId,
    selectBotConversation,
    createBotConversation,
    addBotMessage,
    profile,
  } = useApp();
  const { isActive: isRemoteActive, liveRelaySessions } = useRemoteSession();
  const isTerminalLive = isRemoteActive || liveRelaySessions.length > 0;
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  // Dynamic greeting matching Puku AI
  const greeting = getGreeting(profile?.name);

  // Bot Recent Conversations matching Puku AI post-login screen 1:1
  const displayBotConversations =
    botConversations.length > 0
      ? botConversations.slice(0, 4).map(c => ({
          id: c.id,
          title: c.title || t('pukuBot.untitledSession'),
          time: formatActivityDate((c as any).updated_at || (c as any).created_at || (c as any).updatedAt || (c as any).createdAt || (c as any).activityDate) || t('pukuBot.recent'),
          isReal: true,
        }))
      : [
          {
            id: 'sample-1',
            title: 'What are your computer control capabilities?',
            time: '1h ago',
            isReal: false,
          },
          {
            id: 'sample-2',
            title: 'Help me debug my Node.js server',
            time: '3h ago',
            isReal: false,
          },
          {
            id: 'sample-3',
            title: 'Search latest AI news and summarize',
            time: 'Yesterday',
            isReal: false,
          },
        ];

  // UI state
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

  const [pendingAttachment, setPendingAttachment] = useState<PickedMedia | null>(null);

  // Sync conversation with AppContext
  useEffect(() => {
    if (!isAuthenticated) {
      if (activeBotConversationId) {
        const activeConv = botConversations.find(c => c.id === activeBotConversationId);
        if (activeConv) {
          setMessages(activeConv.messages || []);
          return;
        }
      }
      setMessages([]);
    }
  }, [activeBotConversationId, botConversations, isAuthenticated]);

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
  const [showBotModal, setShowBotModal] = useState(false);
  const [expandedToolCallIds, setExpandedToolCallIds] = useState<Record<string, boolean>>({});

  // Pinned conversations state
  const [pinnedConvIds, setPinnedConvIds] = useState<Record<string, boolean>>({});

  // Skills menu state
  const [skillsList, setSkillsList] = useState<PukuBotSkill[]>([]);
  const [showSkillsMenu, setShowSkillsMenu] = useState(false);

  // Settings multi-tab state
  type SettingsTab = 'profile' | 'instructions' | 'memory' | 'routines' | 'skills' | 'connections';
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('profile');
  const [instructionsText, setInstructionsText] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [memoriesList, setMemoriesList] = useState<PukuBotMemory[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [routinesList, setRoutinesList] = useState<PukuBotRoutine[]>([]);
  const [userSkillsList, setUserSkillsList] = useState<PukuBotSkill[]>([]);
  const [newSkillSlug, setNewSkillSlug] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [showAddSkillForm, setShowAddSkillForm] = useState(false);
  const [connectionsList, setConnectionsList] = useState<PukuBotConnection[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);
  const activeStreamAbortRef = useRef<(() => void) | null>(null);
  const { keyboardHeight } = useKeyboardHeight();

  // Auto-refresh computer screenshot every 2.5 seconds while monitor modal is open
  useEffect(() => {
    let timer: any = null;
    if (showComputerModal && isAuthenticated && selectedBotId) {
      timer = setInterval(() => {
        setScreenshotTimestamp(Date.now());
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showComputerModal, isAuthenticated, selectedBotId]);

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

      let authed = pukuBotApi.isAuthenticated();
      if (!authed) {
        const appToken =
          (await tokenManager.ensureValidToken().catch(() => null)) ||
          tokenManager.getAccessTokenSync();
        if (appToken) {
          await pukuBotApi.setToken(appToken);
          authed = true;
        }
      }

      setIsAuthenticated(authed);
      setBotUser(pukuBotApi.getUser());
      setCustomApiUrl(pukuBotApi.getBaseUrl());

      if (authed) {
        try {
          const [bots, me, skills, instructions, memories, routines, conns, convRes] = await Promise.all([
            pukuBotApi.getBots().catch(() => []),
            pukuBotApi.getMe().catch(() => null),
            pukuBotApi.getSkills().catch(() => []),
            pukuBotApi.getPersonalInstructions().catch(() => ({ instructions: '' })),
            pukuBotApi.getMemories().catch(() => []),
            pukuBotApi.getRoutines().catch(() => []),
            pukuBotApi.getConnections().catch(() => []),
            pukuBotApi.getConversations(20).catch(() => ({ conversations: [] })),
          ]);
          if (!isMounted) return;

          if (bots.length > 0) {
            setAvailableBots(bots);
            setSelectedBotId(bots[0].id);
          }
          if (me) {
            setBotUser(me);
          }
          if (skills) {
            setSkillsList(skills);
            setUserSkillsList(skills);
          }
          if (instructions?.instructions) {
            setInstructionsText(instructions.instructions);
          }
          if (memories) {
            setMemoriesList(memories);
          }
          if (routines) {
            setRoutinesList(routines);
          }
          if (conns) {
            setConnectionsList(conns);
          }
          if (convRes?.conversations) {
            const pinMap: Record<string, boolean> = {};
            convRes.conversations.forEach((c: any) => {
              if (c.pinned) pinMap[c.id] = true;
            });
            setPinnedConvIds(pinMap);
          }

          // Do not auto-load messages if no conversation was actively selected,
          // allowing the initial dashboard page to be shown first!
          if (activeBotConversationId) {
            await loadActiveConversation(bots[0]?.id);
          }
        } catch (e) {
          console.warn('[PukuBotScreen] API load error:', e);
        }
      } else {
        // Load offline cached skills
        pukuBotApi.getSkills().then(s => {
          if (isMounted && s) {
            setSkillsList(s);
            setUserSkillsList(s);
          }
        }).catch(() => {});
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
    // Mount-only: sets up the API client and auth listener once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showBotPickerSheet, setShowBotPickerSheet] = useState(false);

  const handleOpenPicker = () => {
    setShowBotPickerSheet(true);
  };

  const handleTakePhoto = async () => {
    try {
      const file = await NativePicker.takePhoto();
      if (file) setPendingAttachment(file);
    } catch (err: any) {
      Alert.alert(t('pukuBot.cameraErrorTitle'), err?.message || t('pukuBot.couldNotTakePhoto'));
    }
  };

  const handlePickFile = async () => {
    try {
      const file = await NativePicker.pickMedia();
      if (file) setPendingAttachment(file);
    } catch (err: any) {
      Alert.alert(t('pukuBot.uploadErrorTitle'), err?.message || t('pukuBot.couldNotPickFile'));
    }
  };

  const handleSelectRecentConv = async (convId: string) => {
    selectBotConversation(convId);
    const localTarget = botConversations.find(c => c.id === convId);

    if (isAuthenticated) {
      try {
        const msgRes = await pukuBotApi.getMessages(convId, 50);
        if (msgRes && msgRes.messages && msgRes.messages.length > 0) {
          const mapped: LocalChatMessage[] = msgRes.messages.map(m => ({
            id: m.id,
            role: m.role,
            text: m.text,
            toolCalls: m.toolCalls,
          }));
          setMessages(mapped);
          setActiveConversation({ id: convId, botId: selectedBotId } as any);
          return;
        }
      } catch (err) {
        console.warn('[PukuBotScreen] Failed to load remote messages, falling back to local:', err);
      }
    }

    if (localTarget && localTarget.messages && localTarget.messages.length > 0) {
      setMessages(localTarget.messages);
      setActiveConversation({ id: convId, botId: localTarget.botId || selectedBotId } as any);
    } else if (localTarget) {
      setMessages([{ id: Date.now().toString(), role: 'user', text: localTarget.title }]);
      setActiveConversation({ id: convId, botId: localTarget.botId || selectedBotId } as any);
    } else {
      const sampleItem = displayBotConversations.find(c => c.id === convId);
      if (sampleItem) {
        handleSend(sampleItem.title);
      }
    }
  };

  const loadActiveConversation = async (botId?: string) => {
    try {
      const convList = await pukuBotApi.getConversations(5);
      let targetConv = botId
        ? convList.conversations.find(c => c.botId === botId)
        : convList.conversations[0];

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

  const handleNewConversation = async () => {
    selectBotConversation(null as any);
    setActiveConversation(null);
    setMessages([]);
    setPendingAttachment(null);
    if (isAuthenticated) {
      try {
        const newConv = await pukuBotApi.createConversation(serverBotId);
        setActiveConversation(newConv);
      } catch {}
    }
  };

  const toggleToolCallExpanded = (id: string) => {
    setExpandedToolCallIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditMessage = (text: string) => {
    setInputVal(text);
    inputRef.current?.focus();
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Only ids the server listed in /bots are real; anything else (e.g. the
  // initial placeholder before /bots loads) lets the server pick the default.
  const serverBotId = availableBots.some(b => b.id === selectedBotId) ? selectedBotId : undefined;

  // Handle Send: streams the reply from Puku Bot, Puku AI Cloud, or intelligent generative engine
  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend || inputVal).trim();
    if ((!raw && !pendingAttachment) || isTyping || isStreaming) return;

    if (!pukuBotApi.isAuthenticated()) {
      const appToken =
        (await tokenManager.ensureValidToken().catch(() => null)) ||
        tokenManager.getAccessTokenSync();
      if (appToken) {
        await pukuBotApi.setToken(appToken);
        setIsAuthenticated(true);
      }
    }

    const query = raw || (pendingAttachment ? `Analyze this file: ${pendingAttachment.name}` : '');
    const currentAttachment = pendingAttachment;

    const userMsg: LocalChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: 'Just now',
      attachment: currentAttachment || undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setPendingAttachment(null);
    setIsTyping(true);
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

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    const isMockConv = (id?: string) =>
      !id || id.startsWith('bot_conv_') || id.startsWith('sample-') || id.startsWith('local-');

    let handledByBotApi = false;

    // 1. Attempt pukuBotApi if authenticated and server is responsive
    if (pukuBotApi.isAuthenticated()) {
      let currentConv = activeConversation;
      if (!currentConv || isMockConv(currentConv.id)) {
        try {
          const targetBot = serverBotId || selectedBotId || availableBots[0]?.id || 'general-assistant';
          currentConv = await pukuBotApi.createConversation(targetBot);
          setActiveConversation(currentConv);
        } catch (err: any) {
          console.warn('[PukuBotScreen] Failed to create conv on pukuBotApi:', err);
        }
      }

      if (currentConv && !isMockConv(currentConv.id)) {
        try {
          if (currentAttachment) {
            await pukuBotApi.uploadAttachment(currentConv.id, currentAttachment).catch(() => {});
          }

          let detectedSkill: string | undefined;
          if (query.startsWith('/')) {
            const firstWord = query.slice(1).split(/\s+/)[0];
            if (firstWord) detectedSkill = firstWord.toLowerCase();
          }

          const streamPromise = new Promise<boolean>((resolve) => {
            const streamHandle = pukuBotApi.sendMessageStream(
              currentConv.id,
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
                    resolve(true);
                    break;

                  case 'turn.failed':
                    resolve(false);
                    break;
                }
              },
              {
                botId: serverBotId || selectedBotId,
                skills: detectedSkill ? [detectedSkill] : undefined,
              }
            );
            activeStreamAbortRef.current = streamHandle.abort;
          });

          handledByBotApi = await streamPromise;
        } catch (streamErr) {
          console.warn('[PukuBotScreen] stream error on pukuBotApi:', streamErr);
          handledByBotApi = false;
        }
      }
    }

    // 2. If pukuBotApi didn't output text, fallback to pukuApi (Main Cloud AI Engine)
    if (!handledByBotApi || currentAssistantText.trim().length === 0) {
      try {
        const cloudRes = await pukuApi.generateResponse(
          query,
          'puku-ai-2.7',
          undefined,
          (delta: string) => {
            currentAssistantText += delta;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, text: currentAssistantText, toolCalls: [...currentToolCalls] }
                  : m
              )
            );
          }
        );
        if (cloudRes && cloudRes.text) {
          currentAssistantText = cloudRes.text;
          handledByBotApi = true;
        }
      } catch (cloudErr) {
        console.warn('[PukuBotScreen] Cloud fallback error:', cloudErr);
      }
    }

    // 3. If still empty (e.g. offline, network error), use intelligent generative response
    if (currentAssistantText.trim().length === 0) {
      const generated = generateIntelligentResponse(query, selectedBotId);
      currentAssistantText = '';
      await emitProgressively(generated, (chunk: string) => {
        currentAssistantText += chunk;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, text: currentAssistantText, toolCalls: [...currentToolCalls] }
              : m
          )
        );
      });
    }

    setIsTyping(false);
    setIsStreaming(false);
    activeStreamAbortRef.current = null;

    // Clean up empty placeholder if any
    setMessages(prev =>
      prev.filter(
        m =>
          m.id !== assistantMsgId ||
          m.text.trim().length > 0 ||
          (m.toolCalls && m.toolCalls.length > 0)
      )
    );

    // Save to conversation store
    const convId = activeBotConversationId || 'bot_conv_1';
    addBotMessage(convId, { role: 'user', text: query });
    if (currentAssistantText.trim().length > 0 || currentToolCalls.length > 0) {
      addBotMessage(convId, {
        role: 'assistant',
        text: currentAssistantText,
        toolCalls: currentToolCalls,
      });
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
      Alert.alert(t('pukuBot.secretTransmittedTitle'), t('pukuBot.secretTransmittedMessage'));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || t('pukuBot.failedToSubmitSecret'));
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
      Alert.alert(t('pukuBot.controlErrorTitle'), err.message || t('pukuBot.failedToggleControl'));
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
      Alert.alert(t('pukuBot.signInErrorTitle'), err.message || t('pukuBot.couldNotStartOAuth'));
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

  const handleTogglePin = async (convId: string) => {
    const isPinned = !!pinnedConvIds[convId];
    const nextVal = !isPinned;
    setPinnedConvIds(prev => ({ ...prev, [convId]: nextVal }));
    await pukuBotApi.pinConversation(convId, nextVal).catch(() => {});
  };

  const handleDeleteConversation = (convId: string) => {
    Alert.alert(
      t('pukuBot.deleteConvTitle', { defaultValue: 'Delete Conversation?' }),
      t('pukuBot.deleteConvConfirm', { defaultValue: 'This will remove the conversation and all messages.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            await pukuBotApi.deleteConversation(convId).catch(() => {});
            if (activeConversation?.id === convId) {
              setActiveConversation(null);
              setMessages([]);
            }
          },
        },
      ]
    );
  };

  const handleRebuildComputer = async () => {
    if (!selectedBotId) return;
    Alert.alert(
      t('pukuBot.rebuildConfirmTitle', { defaultValue: 'Rebuild Computer?' }),
      t('pukuBot.rebuildConfirmDesc', {
        defaultValue: 'This will terminate the VM and provision a fresh computer environment. Any unsaved temporary files will be wiped.',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('pukuBot.rebuildAction', { defaultValue: 'Rebuild' }),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoadingComputer(true);
              await pukuBotApi.rebuildComputer(selectedBotId);
              Alert.alert(
                t('pukuBot.rebuildStarted', { defaultValue: 'Rebuild Started' }),
                t('pukuBot.rebuildStartedDesc', { defaultValue: 'Computer rebuild has been initiated.' })
              );
              const info = await pukuBotApi.getComputer(selectedBotId);
              setComputerInfo(info);
            } catch (err: any) {
              Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to rebuild computer.');
            } finally {
              setIsLoadingComputer(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true);
    try {
      await pukuBotApi.updatePersonalInstructions(instructionsText);
      Alert.alert(t('common.success', { defaultValue: 'Saved' }), t('pukuBot.instructionsSaved', { defaultValue: 'Personal instructions saved successfully.' }));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to save instructions.');
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemoryInput.trim()) return;
    try {
      const created = await pukuBotApi.createMemory(newMemoryInput.trim(), selectedBotId);
      setMemoriesList(prev => [created, ...prev]);
      setNewMemoryInput('');
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to add memory.');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await pukuBotApi.deleteMemory(id);
      setMemoriesList(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to delete memory.');
    }
  };

  const handleToggleMemoryShare = async (id: string, currentlyShared?: boolean) => {
    try {
      if (currentlyShared) {
        await pukuBotApi.unshareMemory(id);
      } else {
        await pukuBotApi.shareMemory(id);
      }
      setMemoriesList(prev =>
        prev.map(m => (m.id === id ? { ...m, shared: !currentlyShared } : m))
      );
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to update memory.');
    }
  };

  const handleToggleRoutine = async (id: string, currentEnabled: boolean) => {
    try {
      const updated = await pukuBotApi.setRoutineEnabled(id, !currentEnabled);
      setRoutinesList(prev => prev.map(r => (r.id === id ? updated : r)));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to update routine.');
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    try {
      await pukuBotApi.deleteRoutine(id);
      setRoutinesList(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to delete routine.');
    }
  };

  const handleSaveSkill = async () => {
    if (!newSkillSlug.trim() || !newSkillName.trim()) {
      Alert.alert(t('pukuBot.errorTitle'), 'Please enter a slug and title.');
      return;
    }
    try {
      const saved = await pukuBotApi.saveSkill(newSkillSlug.trim(), {
        name: newSkillName.trim(),
        prompt: newSkillPrompt.trim() || `Run ${newSkillName.trim()}`,
      });
      setUserSkillsList(prev => prev.filter(s => s.slug !== saved.slug).concat(saved));
      setSkillsList(prev => prev.filter(s => s.slug !== saved.slug).concat(saved));
      setNewSkillSlug('');
      setNewSkillName('');
      setNewSkillPrompt('');
      setShowAddSkillForm(false);
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to save skill.');
    }
  };

  const handleDeleteSkill = async (slug: string) => {
    try {
      await pukuBotApi.deleteSkill(slug);
      setUserSkillsList(prev => prev.filter(s => s.slug !== slug));
      setSkillsList(prev => prev.filter(s => s.slug !== slug));
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to delete skill.');
    }
  };

  const handleToggleConnection = async (conn: PukuBotConnection) => {
    try {
      if (conn.connected) {
        await pukuBotApi.deleteConnection(conn.id);
        setConnectionsList(prev =>
          prev.map(c => (c.id === conn.id ? { ...c, connected: false } : c))
        );
      } else {
        const res = await pukuBotApi.connectAccount(conn.id);
        if (res.url) {
          await Linking.openURL(res.url).catch(() => {});
        }
        await pukuBotApi.confirmConnection(conn.id);
        setConnectionsList(prev =>
          prev.map(c => (c.id === conn.id ? { ...c, connected: true } : c))
        );
      }
    } catch (err: any) {
      Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to update connection.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('pukuBot.deleteAccountTitle', { defaultValue: 'Delete Account?' }),
      t('pukuBot.deleteAccountConfirm', {
        defaultValue: 'This will permanently delete your account, personal data, and conversations. This cannot be undone.',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await pukuBotApi.deleteAccount();
              setIsAuthenticated(false);
              setBotUser(null);
              setMessages([]);
              setActiveConversation(null);
              setShowSettingsModal(false);
              Alert.alert(t('common.success', { defaultValue: 'Account deleted' }), t('pukuBot.accountDeleted', { defaultValue: 'Your account has been deleted.' }));
            } catch (err: any) {
              Alert.alert(t('pukuBot.errorTitle'), err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
            onPress={() => setDrawerOpen(true)}
            style={styles.leadingBtn}>
            <SidebarToggleIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <PukuBotGradientIcon size={20} />
            <Text
              numberOfLines={1}
              style={[styles.screenTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
              {t('pukuBot.screenTitle')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!isAuthenticated || availableBots.length <= 1}
              onPress={() => setShowBotModal(true)}
              style={[
                styles.badge,
                {
                  backgroundColor: isDark
                    ? 'rgba(176, 179, 252, 0.16)'
                    : 'rgba(72, 77, 208, 0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                },
              ]}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.badgeText, { color: theme.primaryLight, fontFamily: monoFont }]}>
                {isAuthenticated ? (availableBots.find(b => b.id === selectedBotId)?.name || t('pukuBot.liveBadge')) : t('pukuBot.aiBadge')}
              </Text>
              {isAuthenticated && availableBots.length > 1 && (
                <ChevronDownIcon size={10} color={theme.primaryLight} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.trailingGroup}>
          {isAuthenticated && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="New conversation"
              activeOpacity={0.7}
              onPress={handleNewConversation}
              style={styles.actionBtn}>
              <PlusIcon size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to Puku chat"
            activeOpacity={0.7}
            onPress={() => navigate('chat')}
            style={styles.actionBtn}>
            <PukuLogoIcon size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Settings"
            activeOpacity={0.7}
            onPress={() => setShowSettingsModal(true)}
            style={styles.actionBtn}>
            <SettingsIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
            onPress={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
            style={styles.trailingBtn}>
            {isDark ? (
              <SunIcon size={18} color={theme.textPrimary} />
            ) : (
              <MoonIcon size={18} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setNeedsPerson(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={16} color={isDark ? '#F5D070' : '#A36800'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.needsPersonReason, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {needsPerson.reason || (needsPerson.kind === 'secret' ? t('pukuBot.needsSecretReason') : t('pukuBot.needsHelpReason'))}
          </Text>

          {needsPerson.kind === 'secret' ? (
            <View style={styles.secretInputRow}>
              <View style={[styles.secretBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                <TextInput
                  secureTextEntry={isSecretMasked}
                  value={secretInput}
                  onChangeText={setSecretInput}
                  placeholder={needsPerson.label || t('pukuBot.secretPlaceholder')}
                  placeholderTextColor={theme.placeholderText}
                  style={[styles.secretTextInput, { color: theme.textPrimary, fontFamily: monoFont }]}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show or hide password" onPress={() => setIsSecretMasked(!isSecretMasked)} style={styles.eyeBtn}>
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
                    {t('pukuBot.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.needsPersonActions}>
              <TouchableOpacity
                onPress={handleToggleControl}
                style={[styles.needsPersonBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                <Text style={[styles.needsPersonBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                  {t('pukuBot.takeControl')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Chat Messages or Initial Dashboard Page */}
      {messages.length === 0 ? (
        <ScrollView
          style={styles.emptyScrollView}
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* 1. Hero Row with Dynamic Greeting */}
          <View style={styles.botHeroRow}>
            <View style={styles.botHeadlineWrapper}>
              <Text style={[styles.botHeadlineLead, { color: theme.textSecondary }]}>
                {greeting.lead}
              </Text>
              <Text style={[styles.botHeadlineName, { color: theme.textPrimary }]}>
                {greeting.name}
              </Text>
            </View>
          </View>

          {/* 2. Recent Conversations Section */}
          <View style={styles.botRecentsSection}>
            <Text style={[styles.botRecentsTitle, { color: theme.textSecondary, fontFamily: monoFont }]}>
              {t('pukuBot.recentConversations')}
            </Text>
            <View style={[styles.botDivider, { backgroundColor: theme.border }]} />

            {[...displayBotConversations]
              .sort((a, b) => {
                const aPin = pinnedConvIds[a.id] ? 1 : 0;
                const bPin = pinnedConvIds[b.id] ? 1 : 0;
                return bPin - aPin;
              })
              .map(conv => (
                <View key={conv.id}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectRecentConv(conv.id)}
                    style={styles.botRecentItemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 }}>
                      {pinnedConvIds[conv.id] && (
                        <PinIcon size={14} color="#35D6B4" />
                      )}
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[styles.botRecentItemTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                        {conv.title}
                      </Text>
                    </View>
                    <View style={styles.botRecentRightWrap}>
                      <Text style={[styles.botRecentItemTime, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {conv.time}
                      </Text>
                      {conv.isReal && (
                        <>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Pin conversation"
                            onPress={() => handleTogglePin(conv.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4 }}>
                            <PinIcon size={14} color={pinnedConvIds[conv.id] ? '#35D6B4' : theme.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Delete conversation"
                            onPress={() => handleDeleteConversation(conv.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4 }}>
                            <TrashIcon size={14} color="#FF4D4F" />
                          </TouchableOpacity>
                        </>
                      )}
                      <ArrowUpRightIcon size={14} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                  <View style={[styles.botDivider, { backgroundColor: theme.border }]} />
                </View>
              ))}
          </View>
        </ScrollView>
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
            renderItem={({ item, index }) => {
              const isUser = item.role === 'user';
              const { thoughts, responseText } = isUser
                ? { thoughts: '', responseText: item.text }
                : parseBotContent(item.text);
              const hasToolCalls = !isUser && !!item.toolCalls && item.toolCalls.length > 0;
              const hasThoughts = !isUser && thoughts.trim().length > 0;
              const hasResponseText = !isUser && responseText.trim().length > 0;
              const isLastItem = index === messages.length - 1;
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

                    {/* Bot Thought Process (collapsible accordion for reasoning traces) */}
                    {!isUser && hasThoughts && (
                      <BotThoughtAccordion
                        thoughts={thoughts}
                        isStreaming={isStreaming && isLastItem}
                        theme={theme}
                        isDark={isDark}
                        monoFont={monoFont}
                      />
                    )}

                    {/* Chat Bubble: User content OR Assistant response OR Typing indicator */}
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
                        <MarkdownRenderer content={responseText} theme={theme} />
                      </View>
                    ) : isWaitingForFirstOutput ? (
                      <View style={{ paddingVertical: 4, paddingHorizontal: 4 }}>
                        <TypingIndicator theme={theme} />
                      </View>
                    ) : null}

                    {isUser && (
                      <View style={styles.botUserActionRow}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy"
                          activeOpacity={0.6}
                          onPress={() => NativeClipboard.setString(item.text)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.actionBtnSmall}>
                          <CopyIcon size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit"
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
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy bot answer"
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
            }}
            ListFooterComponent={
              isTyping && !isStreaming ? (
                <View style={styles.typingIndicatorRow}>
                  <Text style={[styles.typingText, { color: theme.textMuted, fontFamily: monoFont }]}>
                    {t('pukuBot.typingIndicator')}
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
        {/* Pending Attachment Preview (Any File / Photo) */}
        {pendingAttachment && (
          <View style={[styles.attachmentPreviewWrap, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
            {pendingAttachment.type.startsWith('image/') ? (
              <Image source={{ uri: pendingAttachment.uri }} style={styles.attachmentThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.docIconWrap, { backgroundColor: theme.secondaryBackground }]}>
                <PaperclipIcon size={16} color={theme.textPrimary} />
              </View>
            )}
            <View style={styles.attachmentInfoWrap}>
              <Text numberOfLines={1} style={[styles.attachmentName, { color: theme.textPrimary, fontFamily: monoFont }]}>
                {pendingAttachment.name}
              </Text>
              {pendingAttachment.size ? (
                <Text style={[styles.attachmentSize, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {Math.round(pendingAttachment.size / 1024)} KB
                </Text>
              ) : null}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setPendingAttachment(null)} style={styles.removeAttBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* / Skills Autocomplete Menu */}
        {(showSkillsMenu || (inputVal.startsWith('/') && !inputVal.includes(' '))) && skillsList.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
            {skillsList.map(skill => (
              <TouchableOpacity
                key={skill.slug}
                activeOpacity={0.7}
                onPress={() => {
                  setInputVal(`/${skill.slug} `);
                  setShowSkillsMenu(false);
                  inputRef.current?.focus();
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#232924' : '#EAECE6',
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#35D6B4', fontFamily: monoFont }}>
                  /{skill.slug}
                </Text>
                <Text style={{ fontSize: 10.5, color: theme.textMuted, fontFamily: monoFont }}>
                  {skill.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput
          ref={inputRef}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={t('pukuBot.composerPlaceholder')}
          placeholderTextColor={theme.placeholderText}
          multiline
          style={[styles.composerInput, { color: theme.textPrimary, fontFamily: monoFont }]}
        />

        <View style={styles.composerBottomRow}>
          <View style={styles.composerLeftMeta}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Attach file"
              activeOpacity={0.7}
              onPress={handleOpenPicker}
              style={[styles.composerIconBtn, { borderColor: theme.border }]}>
              <PaperclipIcon size={17} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skills menu"
              activeOpacity={0.7}
              onPress={() => setShowSkillsMenu(prev => !prev)}
              style={[
                styles.composerIconBtn,
                {
                  marginLeft: 8,
                  borderColor: showSkillsMenu ? '#35D6B4' : theme.border,
                  backgroundColor: showSkillsMenu ? (isDark ? '#1C271E' : '#E0F3E5') : 'transparent',
                },
              ]}>
              <SparkleIcon size={16} color={showSkillsMenu ? '#35D6B4' : theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {isStreaming ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Stop"
              activeOpacity={0.7}
              onPress={handleStopStream}
              style={[styles.sendBtn, { backgroundColor: '#FF4D4F' }]}>
              <StopSquareIcon size={14} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send"
              activeOpacity={0.7}
              disabled={(!inputVal.trim() && !pendingAttachment) || isTyping}
              onPress={() => handleSend()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: (inputVal.trim() || pendingAttachment)
                    ? (isDark ? '#E4E8E2' : '#1A1D18')
                    : (isDark ? '#262925' : '#E4E5DB'),
                },
              ]}>
              <UpArrowIcon
                size={18}
                color={(inputVal.trim() || pendingAttachment) ? (isDark ? '#141613' : '#FFFFFF') : theme.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Settings Modal with Multi-Tab Navigation */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                {t('pukuBot.settingsTitle')}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowSettingsModal(false)}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab Navigation */}
            <View style={{ paddingTop: 10, paddingBottom: 6 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(
                  [
                    { key: 'profile', label: 'General' },
                    { key: 'instructions', label: 'Instructions' },
                    { key: 'memory', label: 'Memory' },
                    { key: 'routines', label: 'Routines' },
                    { key: 'skills', label: 'Skills' },
                    { key: 'connections', label: 'Accounts' },
                  ] as Array<{ key: SettingsTab; label: string }>
                ).map(tab => {
                  const isActive = activeSettingsTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setActiveSettingsTab(tab.key)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 14,
                        backgroundColor: isActive
                          ? (isDark ? '#35D6B4' : '#1A1D18')
                          : (isDark ? '#232924' : '#EAECE6'),
                        borderWidth: 1,
                        borderColor: isActive ? '#35D6B4' : theme.border,
                      }}>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? (isDark ? '#141613' : '#FFFFFF') : theme.textSecondary,
                          fontFamily: monoFont,
                        }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView style={{ paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
              {/* TAB 1: Profile & General */}
              {activeSettingsTab === 'profile' && (
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
                    {t('pukuBot.apiBaseUrlLabel')}
                  </Text>
                  <TextInput
                    value={__DEV__ ? customApiUrl : ENV.PUKU_BOT_API_BASE_URL}
                    onChangeText={__DEV__ ? setCustomApiUrl : undefined}
                    editable={__DEV__}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="https://app.bot.puku.sh/api/v1"
                    placeholderTextColor={theme.placeholderText}
                    style={[
                      styles.settingsInput,
                      {
                        color: __DEV__ ? theme.textPrimary : theme.textMuted,
                        borderColor: theme.border,
                        fontFamily: monoFont,
                      },
                    ]}
                  />

                  {__DEV__ && (
                    <View style={styles.quickEnvRow}>
                      <TouchableOpacity
                        onPress={() => setCustomApiUrl(ENV.PUKU_BOT_API_BASE_URL)}
                        style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                        <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                          {t('pukuBot.envCloudProd')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setCustomApiUrl(ENV.PUKU_BOT_LOCAL_BASE_URL)}
                        style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                        <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                          {t('pukuBot.envLocal')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Account Status Box */}
                  <View style={[styles.accountBox, { borderColor: theme.border }]}>
                    {isAuthenticated ? (
                      <View>
                        <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                          {t('pukuBot.signedInAs')}
                        </Text>
                        <Text style={[styles.accountEmail, { color: theme.textSecondary, fontFamily: monoFont }]}>
                          {botUser?.email || t('pukuBot.defaultUserFallback')}
                        </Text>

                        <TouchableOpacity
                          onPress={handleSignOut}
                          style={[styles.signOutBtn, { borderColor: '#FF4D4F', marginBottom: 12 }]}>
                          <Text style={[styles.signOutText, { color: '#FF4D4F', fontFamily: monoFont }]}>
                            {t('pukuBot.signOut')}
                          </Text>
                        </TouchableOpacity>

                        {/* Danger Zone: Account Deletion */}
                        <TouchableOpacity
                          onPress={handleDeleteAccount}
                          style={[styles.signOutBtn, { borderColor: 'rgba(255, 77, 79, 0.4)', backgroundColor: 'rgba(255, 77, 79, 0.08)' }]}>
                          <Text style={[styles.signOutText, { color: '#FF4D4F', fontFamily: monoFont, fontSize: 11 }]}>
                            Delete Account & Data
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                          {t('pukuBot.connectTitle')}
                        </Text>
                        <Text style={[styles.accountDesc, { color: theme.textMuted, fontFamily: monoFont }]}>
                          {t('pukuBot.connectDescription')}
                        </Text>

                        <TouchableOpacity
                          disabled={isConnectingAuth}
                          onPress={handleConnectAuth}
                          style={[styles.signInBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                          {isConnectingAuth ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.signInBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                              {t('pukuBot.signInButton')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 2: Personal Instructions */}
              {activeSettingsTab === 'instructions' && (
                <View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Personal instructions on how your Bots should talk to you (tone, brevity, formatting):
                  </Text>
                  <TextInput
                    value={instructionsText}
                    onChangeText={setInstructionsText}
                    maxLength={4000}
                    multiline
                    numberOfLines={6}
                    placeholder="e.g. Always be concise. Format code in clean TypeScript. Do not explain basics."
                    placeholderTextColor={theme.placeholderText}
                    style={{
                      minHeight: 120,
                      maxHeight: 180,
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.secondaryBackground,
                      color: theme.textPrimary,
                      fontFamily: monoFont,
                      fontSize: 12.5,
                      textAlignVertical: 'top',
                    }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: monoFont }}>
                      {instructionsText.length}/4000 chars
                    </Text>
                    <TouchableOpacity
                      disabled={isSavingInstructions}
                      onPress={handleSaveInstructions}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: isDark ? '#35D6B4' : '#1A1D18',
                      }}>
                      {isSavingInstructions ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={{ color: isDark ? '#141613' : '#FFF', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                          Save Instructions
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 3: Memories */}
              {activeSettingsTab === 'memory' && (
                <View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Context and facts your bot remembers:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TextInput
                      value={newMemoryInput}
                      onChangeText={setNewMemoryInput}
                      placeholder="Add a new memory..."
                      placeholderTextColor={theme.placeholderText}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        paddingHorizontal: 10,
                        color: theme.textPrimary,
                        fontSize: 12,
                        fontFamily: monoFont,
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleAddMemory}
                      style={{
                        height: 38,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        backgroundColor: isDark ? '#35D6B4' : '#1A1D18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ color: isDark ? '#141613' : '#FFF', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {memoriesList.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                      No memories stored yet.
                    </Text>
                  ) : (
                    memoriesList.map(mem => (
                      <View
                        key={mem.id}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.secondaryBackground,
                          marginBottom: 8,
                        }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 12.5, fontFamily: monoFont }}>
                          {mem.content}
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <TouchableOpacity
                            onPress={() => handleToggleMemoryShare(mem.id, mem.shared)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: mem.shared ? 'rgba(53, 214, 180, 0.15)' : 'transparent',
                              borderWidth: 1,
                              borderColor: mem.shared ? '#35D6B4' : theme.border,
                            }}>
                            <Text style={{ fontSize: 10.5, color: mem.shared ? '#35D6B4' : theme.textMuted, fontFamily: monoFont }}>
                              {mem.shared ? 'Shared with all Bots' : 'Private to Bot'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteMemory(mem.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <TrashIcon size={14} color="#FF4D4F" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 4: Routines */}
              {activeSettingsTab === 'routines' && (
                <View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Scheduled work and automated tasks:
                  </Text>
                  {routinesList.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                      No active routines. You can create one via chat (e.g. &quot;Every weekday at 9am, summarize GitHub PRs&quot;).
                    </Text>
                  ) : (
                    routinesList.map(rt => (
                      <View
                        key={rt.id}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.secondaryBackground,
                          marginBottom: 8,
                        }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                            {rt.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleToggleRoutine(rt.id, rt.enabled)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: rt.enabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                            }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: rt.enabled ? '#22C55E' : '#FF4D4F', fontFamily: monoFont }}>
                              {rt.enabled ? 'Enabled' : 'Paused'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4, fontFamily: monoFont }}>
                          Schedule: {rt.schedule}
                        </Text>
                        <Text numberOfLines={2} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, fontFamily: monoFont }}>
                          {rt.prompt}
                        </Text>
                        <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                          <TouchableOpacity onPress={() => handleDeleteRoutine(rt.id)}>
                            <TrashIcon size={14} color="#FF4D4F" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 5: Skills */}
              {activeSettingsTab === 'skills' && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: monoFont }}>
                      Custom / skills available in chat:
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowAddSkillForm(prev => !prev)}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }}>
                      <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
                        {showAddSkillForm ? 'Cancel' : '+ New Skill'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showAddSkillForm && (
                    <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#35D6B4', marginBottom: 12, backgroundColor: theme.secondaryBackground }}>
                      <TextInput
                        value={newSkillSlug}
                        onChangeText={setNewSkillSlug}
                        placeholder="slug (e.g. translate-french)"
                        placeholderTextColor={theme.placeholderText}
                        style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                      />
                      <TextInput
                        value={newSkillName}
                        onChangeText={setNewSkillName}
                        placeholder="Skill Name (e.g. Translate to French)"
                        placeholderTextColor={theme.placeholderText}
                        style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                      />
                      <TextInput
                        value={newSkillPrompt}
                        onChangeText={setNewSkillPrompt}
                        placeholder="Prompt template"
                        placeholderTextColor={theme.placeholderText}
                        style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 8, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                      />
                      <TouchableOpacity
                        onPress={handleSaveSkill}
                        style={{ height: 34, borderRadius: 6, backgroundColor: '#35D6B4', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#141613', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                          Save Skill
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {userSkillsList.map(skill => (
                    <View
                      key={skill.slug}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.secondaryBackground,
                        marginBottom: 8,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: '#35D6B4', fontWeight: '700', fontSize: 12.5, fontFamily: monoFont }}>
                          /{skill.slug}
                        </Text>
                        <Text style={{ color: theme.textPrimary, fontSize: 12, marginTop: 2, fontFamily: monoFont }}>
                          {skill.name}
                        </Text>
                        {skill.description ? (
                          <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                            {skill.description}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteSkill(skill.slug)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <TrashIcon size={14} color="#FF4D4F" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* TAB 6: Connected Accounts */}
              {activeSettingsTab === 'connections' && (
                <View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Connected accounts and OAuth integrations:
                  </Text>
                  {connectionsList.map(conn => (
                    <View
                      key={conn.id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.secondaryBackground,
                        marginBottom: 8,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <View>
                        <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                          {conn.name || conn.service}
                        </Text>
                        <Text style={{ color: conn.connected ? '#22C55E' : theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                          {conn.connected ? '● Connected' : '○ Not connected'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleConnection(conn)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: conn.connected ? 'rgba(255, 77, 79, 0.12)' : isDark ? '#35D6B4' : '#1A1D18',
                          borderWidth: conn.connected ? 1 : 0,
                          borderColor: '#FF4D4F',
                        }}>
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '700',
                            color: conn.connected ? '#FF4D4F' : isDark ? '#141613' : '#FFFFFF',
                            fontFamily: monoFont,
                          }}>
                          {conn.connected ? 'Disconnect' : 'Connect'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Computer Screen & Rebuild Modal */}
      <Modal
        visible={showComputerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComputerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ComputerMonitorIcon size={18} color="#35D6B4" />
                <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {t('pukuBot.computerTitle', { defaultValue: "Bot's Computer" })}
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowComputerModal(false)}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 14 }}>
              {/* Status bar */}
              <View style={[styles.computerStatusBar, { borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          computerInfo?.status?.state === 'ready'
                            ? '#22C55E'
                            : computerInfo?.status?.state === 'starting'
                            ? '#F59E0B'
                            : '#EF4444',
                      },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                    State: {computerInfo?.status?.state || 'absent'}
                  </Text>
                </View>
                <Text style={[styles.statusText, { color: theme.textMuted, fontFamily: monoFont }]}>
                  Control: {computerInfo?.control?.holder === 'human' ? 'You' : 'Bot'}
                </Text>
              </View>

              {/* Screen preview */}
              <View style={[styles.screenFrame, { borderColor: theme.border, backgroundColor: '#000000' }]}>
                {isLoadingComputer ? (
                  <View style={styles.screenLoader}>
                    <ActivityIndicator size="small" color="#35D6B4" />
                    <Text style={{ color: '#888', fontSize: 11, marginTop: 6, fontFamily: monoFont }}>
                      Connecting to display...
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: `${pukuBotApi.getScreenshotUrl(selectedBotId)}?t=${screenshotTimestamp}` }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.computerActionRow}>
                <TouchableOpacity
                  disabled={isTakingControl}
                  onPress={handleToggleControl}
                  style={[
                    styles.primaryActionBtn,
                    {
                      backgroundColor:
                        computerInfo?.control?.holder === 'human' ? '#EF4444' : isDark ? '#35D6B4' : '#1A1D18',
                      borderColor: theme.border,
                    },
                  ]}>
                  {isTakingControl ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.actionBtnText,
                        {
                          color:
                            computerInfo?.control?.holder === 'human'
                              ? '#FFF'
                              : isDark
                              ? '#141613'
                              : '#FFF',
                          fontFamily: monoFont,
                        },
                      ]}>
                      {computerInfo?.control?.holder === 'human'
                        ? t('pukuBot.releaseControl', { defaultValue: 'Hand Back Control' })
                        : t('pukuBot.takeControl', { defaultValue: 'Take Control' })}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRebuildComputer}
                  style={[styles.secondaryActionBtn, { borderColor: '#EF4444' }]}>
                  <RefreshIcon size={14} color="#EF4444" />
                  <Text style={[styles.secondaryBtnText, { color: '#EF4444', fontFamily: monoFont, fontWeight: '700' }]}>
                    {t('pukuBot.rebuild', { defaultValue: 'Rebuild' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bot Switcher Modal */}
      <Modal
        visible={showBotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                {t('pukuBot.selectBot')}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowBotModal(false)}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12, gap: 8 }}>
              {availableBots.map(bot => {
                const isSelected = bot.id === selectedBotId;
                return (
                  <TouchableOpacity
                    key={bot.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedBotId(bot.id);
                      loadActiveConversation(bot.id);
                      setShowBotModal(false);
                    }}
                    style={[
                      styles.botSelectRow,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#1C271E' : '#E0F3E5')
                          : 'transparent',
                        borderColor: isSelected ? '#94C7A0' : theme.border,
                      },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.botSelectName, { color: theme.textPrimary, fontFamily: monoFont }]}>
                        {bot.name || bot.title}
                      </Text>
                      {bot.description ? (
                        <Text
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[styles.botSelectDesc, { color: theme.textMuted, fontFamily: monoFont }]}>
                          {bot.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <CheckmarkIcon size={16} color={isDark ? '#94C7A0' : '#2D7543'} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <MediaPickerModal
        visible={showBotPickerSheet}
        theme={theme}
        isDark={isDark}
        title={t('pukuBot.attachPhotoOrFile')}
        onClose={() => setShowBotPickerSheet(false)}
        onTakePhoto={handleTakePhoto}
        onPickMedia={handlePickFile}
      />
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
    paddingHorizontal: 12,
  },
  headerLeft: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  leadingBtn: {
    width: 24,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trailingBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    flexShrink: 0,
  },
  computerBtn: {
    borderRadius: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 1,
    maxWidth: 95,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 3,
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
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexShrink: 0,
  },
  composerInput: {
    fontSize: 15.5,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 140,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
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
  toolDetailsCard: {
    marginTop: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolDetailsText: {
    fontSize: 11,
    lineHeight: 16,
  },
  toolDetailsResultText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    fontWeight: '600',
  },
  botSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  botSelectName: {
    fontSize: 13,
    fontWeight: '700',
  },
  botSelectDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyScrollView: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  botHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 8,
  },
  botHeadlineWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  botHeadlineLead: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  botHeadlineName: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  botComputerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12, // official Puku "panelRadius" token
    borderWidth: 1,
  },
  botRecentsSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  botRecentsTitle: {
    fontSize: 13,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  botDivider: {
    height: 1,
    width: '100%',
  },
  botRecentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  botRecentItemTitle: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  botRecentRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botRecentItemTime: {
    fontSize: 12,
  },
  composerIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  attachmentThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfoWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 10.5,
    marginTop: 2,
  },
  removeAttBtn: {
    padding: 4,
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
