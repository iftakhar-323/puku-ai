import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { useTranslation } from 'react-i18next';
import i18next from '../../i18n';
import Svg, { Rect } from 'react-native-svg';
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
import {
  MAX_INSTRUCTIONS_LENGTH,
  PukuBotUnavailableError,
  pukuBotApi,
  toSkillSlug,
} from '../../services/pukuBotApi';
import { PukuBotWorkspaceSheet, WorkspaceSheetPanel } from './PukuBotWorkspaceSheet';
import { pukuBotOutbox, PukuBotOutboxEntry } from '../../services/pukuBotOutbox';
import { isOnline, addConnectivityListener } from '../../utils/connectivity';
import { ignore } from '../../utils/devLog';
import { useApp } from '../../store/AppContext';
import { useRemoteSession } from '../../store/RemoteSessionContext';
import {
  PukuBotAttachment,
  PukuBotConnection,
  PukuBotConversation,
  PukuBotItem,
  PukuBotMemory,
  PukuBotMessage,
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
  attachments?: PukuBotAttachment[];
  botId?: string;
  botName?: string;
  kind?: 'background_task';
  /** A status line from the app (e.g. a failed reply), not something a Bot said. */
  notice?: boolean;
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

function StopSquareIcon({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="5" width="14" height="14" rx="2" fill={color} />
    </Svg>
  );
}

/** Plain-language activity lines for the Bot's common tools. */
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

/**
 * Splits a leading `/skill` off a message when the answering Bot holds that
 * skill (GET /bots/:id). Unknown slugs stay part of the text, since the
 * server answers `400 This Bot does not have /slug.` for them.
 */
export function splitSkillCommand(
  text: string,
  knownSlugs: string[]
): { skill?: string; body: string } {
  const match = text.match(/^\/([a-z0-9][a-z0-9_-]*)(?:\s+([\s\S]*))?$/i);
  if (!match) return { body: text };
  const slug = match[1].toLowerCase();
  if (!knownSlugs.includes(slug)) return { body: text };
  return { skill: slug, body: (match[2] || '').trim() };
}

/** A short sentence a person can read, never a stack trace or payload. */
function isReadableMessage(message?: string): message is string {
  if (!message) return false;
  const m = message.trim();
  return (
    m.length > 0 &&
    m.length <= 160 &&
    !/[{}<>]|\bat \w+ \(|Error:|Exception|undefined|null|\bfalse\b|\btrue\b/.test(m)
  );
}

/** What to tell the person when a reply ends with `turn.failed`. */
export function describeTurnFailure(event: { code?: string; message?: string }): string | null {
  switch (event.code) {
    case 'stopped':
      return null;
    case 'busy':
      return i18next.t('pukuBot.replyBusy', {
        defaultValue: 'This Bot is still answering. Wait for it, or stop it.',
      });
    case 'timeout':
      return i18next.t('pukuBot.replyTimeout', {
        defaultValue: 'The reply took too long. Please try again.',
      });
    case 'too_many_steps':
      return i18next.t('pukuBot.replyTooManySteps', {
        defaultValue: 'The Bot ran out of steps before finishing. Try a smaller task.',
      });
    default:
      return isReadableMessage(event.message)
        ? event.message
        : i18next.t('pukuBot.replyFailed', {
            defaultValue: "The Bot couldn't finish this reply. Please try again.",
          });
  }
}

function toLocalMessages(list: PukuBotMessage[]): LocalChatMessage[] {
  return list.map(m => ({
    id: m.id,
    role: m.role,
    text: m.text,
    botId: m.botId,
    botName: m.botName,
    kind: m.kind,
    attachments: m.attachments,
    toolCalls: m.toolCalls,
  }));
}

/** How many conversations the home screen lists: the latest ones only. */
export const HOME_RECENT_LIMIT = 3;

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
    selectBotConversation,
    replaceBotConversations,
    profile,
    botWorkspaceRequest,
    clearBotWorkspaceRequest,
    isDrawerOpen,
  } = useApp();
  const { isActive: isRemoteActive, liveRelaySessions } = useRemoteSession();
  const isTerminalLive = isRemoteActive || liveRelaySessions.length > 0;
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  // Dynamic greeting matching Puku AI
  const greeting = getGreeting(profile?.name);

  // UI state
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const loadedBeforeIdsRef = useRef<Set<string>>(new Set());
  const [isDeviceOnline, setIsDeviceOnline] = useState(true);
  const [outboxEntries, setOutboxEntries] = useState<PukuBotOutboxEntry[]>([]);
  const [outboxNotice, setOutboxNotice] = useState<string | null>(null);

  // Puku Bot API (v1) state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [botUser, setBotUser] = useState<PukuBotUser | null>(null);
  const [availableBots, setAvailableBots] = useState<PukuBotItem[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('general-assistant');
  // Until the person picks a Bot, a new conversation is auto-routed by its text.
  const [botPickedByUser, setBotPickedByUser] = useState(false);
  const [activeConversation, setActiveConversation] = useState<PukuBotConversation | null>(null);
  const [serverConversations, setServerConversations] = useState<PukuBotConversation[]>([]);
  const [conversationsCursor, setConversationsCursor] = useState<string | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<PickedMedia | null>(null);

  // Human-in-the-loop (needs_person) state
  const [needsPerson, setNeedsPerson] = useState<NeedsPersonState | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [isSecretMasked, setIsSecretMasked] = useState(true);
  const [isSubmittingSecret, setIsSubmittingSecret] = useState(false);

  // Settings / Connection modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(pukuBotApi.getBaseUrl());
  const [isConnectingAuth, setIsConnectingAuth] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [expandedToolCallIds, setExpandedToolCallIds] = useState<Record<string, boolean>>({});

  // Pinned conversations state
  const [pinnedConvIds, setPinnedConvIds] = useState<Record<string, boolean>>({});

  // `/` skills of the selected Bot (GET /bots/:id), offered in the composer
  const [botSkills, setBotSkills] = useState<PukuBotSkill[]>([]);
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
  // Memory is per Bot: the Bot whose memories the Memory tab shows, as on the web.
  const [memoryBotId, setMemoryBotId] = useState<string | null>(null);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [sharingMemoryId, setSharingMemoryId] = useState<string | null>(null);
  // Agents and Marketplace
  const [workspaceSheet, setWorkspaceSheet] = useState<WorkspaceSheetPanel | null>(null);
  const [connectionsList, setConnectionsList] = useState<PukuBotConnection[]>([]);
  // Set when this server does not offer Connected accounts to the app yet.
  const [connectionsNotice, setConnectionsNotice] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);
  // The reply being streamed, so Stop and unmount can end it.
  const activeStreamRef = useRef<{ conversationId: string; detach: () => void } | null>(null);
  // The conversation being opened; guards against out-of-order loads.
  const openingConvIdRef = useRef<string | null>(null);
  const { keyboardHeight } = useKeyboardHeight();


  // Scroll to bottom on keyboard or new messages
  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [keyboardHeight]);

  const applyConversationPage = (list: PukuBotConversation[], nextCursor: string | null, append: boolean) => {
    setServerConversations(prev => {
      if (!append) return list;
      const seen = new Set(prev.map(c => c.id));
      return [...prev, ...list.filter(c => !seen.has(c.id))];
    });
    setConversationsCursor(nextCursor);
    setPinnedConvIds(prev => {
      const next = append ? { ...prev } : {};
      list.forEach(c => {
        if (c.pinned) next[c.id] = true;
      });
      return next;
    });
  };

  const refreshConversations = async () => {
    try {
      const res = await pukuBotApi.getConversations(20);
      applyConversationPage(res.conversations || [], res.nextCursor ?? null, false);
    } catch (err) {
      console.warn('[PukuBotScreen] Failed to refresh conversations:', err);
    }
  };

  // Keep the drawer's Bot list in step with the server's conversations.
  useEffect(() => {
    if (!isAuthenticated) return;
    replaceBotConversations(
      serverConversations.map(c => ({
        id: c.id,
        botId: c.botId || selectedBotId,
        title: c.title || t('pukuBot.untitledSession'),
        createdAt: c.createdAt || c.lastMessageAt || new Date().toISOString(),
        updatedAt: c.lastMessageAt || c.createdAt || new Date().toISOString(),
        messages: [],
      }))
    );
    // replaceBotConversations is stable; selectedBotId only fills a gap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverConversations, isAuthenticated]);

  // Live inbox (GET /events): refresh the list when anything changes.
  useEffect(() => {
    if (!isAuthenticated) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const subscription = pukuBotApi.subscribeLiveInbox(() => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        refreshConversations();
      }, 400);
    });
    return () => {
      subscription.abort();
      if (debounce) clearTimeout(debounce);
    };
    // refreshConversations only uses state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // The selected Bot's `/` skills for the composer menu.
  useEffect(() => {
    if (!isAuthenticated || !availableBots.some(b => b.id === selectedBotId)) {
      setBotSkills([]);
      return;
    }
    let cancelled = false;
    pukuBotApi
      .getBot(selectedBotId)
      .then(bot => {
        if (!cancelled) setBotSkills(Array.isArray(bot.skills) ? bot.skills : []);
      })
      .catch(() => {
        if (!cancelled) setBotSkills([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, availableBots, selectedBotId]);

  // The Memory tab's Bot: the one in use until the person picks another.
  const shownMemoryBotId = memoryBotId || selectedBotId;
  useEffect(() => {
    if (!isAuthenticated || !shownMemoryBotId) return;
    let cancelled = false;
    setIsLoadingMemories(true);
    pukuBotApi
      .getMemories(shownMemoryBotId)
      .then(list => {
        if (!cancelled) setMemoriesList(list);
      })
      .catch(() => {
        if (!cancelled) setMemoriesList([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMemories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, shownMemoryBotId]);

  // The drawer's Workspace entries: Skills and Memory are tabs of the settings
  // sheet; Agents and Marketplace have a sheet of their own.
  //
  // The drawer is itself a Modal. iOS will not present a Modal while another is
  // still being dismissed (it silently shows nothing), so a request waits until
  // the drawer has closed and its dismissal has finished.
  useEffect(() => {
    if (!botWorkspaceRequest || isDrawerOpen) return;
    const { panel } = botWorkspaceRequest;
    const timer = setTimeout(
      () => {
        clearBotWorkspaceRequest();
        if (panel === 'skills' || panel === 'memory') {
          setWorkspaceSheet(null);
          setActiveSettingsTab(panel);
          setShowSettingsModal(true);
          if (panel === 'skills' && pukuBotApi.isAuthenticated()) {
            pukuBotApi.getSkills().then(setUserSkillsList).catch(ignore('PukuBotScreen'));
          }
        } else {
          setShowSettingsModal(false);
          setWorkspaceSheet(panel);
        }
      },
      Platform.OS === 'ios' ? 450 : 0
    );
    return () => clearTimeout(timer);
    // clearBotWorkspaceRequest is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botWorkspaceRequest, isDrawerOpen]);

  /** From Agents or Marketplace: refresh the roster (it may have just grown) and talk to that Bot. */
  const handleStartChatWith = async (botId: string) => {
    setWorkspaceSheet(null);
    const bots = await pukuBotApi.getBots().catch(() => null);
    if (bots && bots.length > 0) setAvailableBots(bots);
    setSelectedBotId(botId);
    handleNewConversation();
  };

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
          const [bots, me, skills, instructions, routines, conns, convRes] = await Promise.all([
            pukuBotApi.getBots().catch(() => []),
            pukuBotApi.getMe().catch(() => null),
            pukuBotApi.getSkills().catch(() => []),
            pukuBotApi.getPersonalInstructions().catch(() => ({ instructions: '' })),
            pukuBotApi.getRoutines().catch(() => []),
            pukuBotApi.getConnections().catch((err: unknown) => {
              if (err instanceof PukuBotUnavailableError) setConnectionsNotice(err.message);
              return [];
            }),
            pukuBotApi.getConversations(20).catch(() => ({ conversations: [], nextCursor: null })),
          ]);
          if (!isMounted) return;

          if (bots.length > 0) {
            setAvailableBots(bots);
            setSelectedBotId((bots.find(b => b.default) || bots[0]).id);
          }
          if (me) {
            setBotUser(me);
          }
          setUserSkillsList(skills);
          if (instructions?.instructions) {
            setInstructionsText(instructions.instructions);
          }
          setRoutinesList(routines);
          setConnectionsList(conns);
          applyConversationPage(convRes.conversations || [], convRes.nextCursor ?? null, false);
        } catch (e) {
          console.warn('[PukuBotScreen] API load error:', e);
        }
      } else {
        // Offline / signed out: show whatever this device cached.
        pukuBotApi.getSkills().then(s => {
          if (isMounted) setUserSkillsList(s);
        }).catch(ignore('PukuBotScreen'));
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
      // Leaving the screen only stops listening: the reply keeps running on
      // the server and is there when the conversation is opened again.
      activeStreamRef.current?.detach();
    };
    // Mount-only: sets up the API client and auth listener once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offline connectivity tracking and automatic outbox replay
  useEffect(() => {
    isOnline().then(setIsDeviceOnline);
    const unsubNet = addConnectivityListener(online => {
      setIsDeviceOnline(online);
      if (online && isAuthenticated) {
        pukuBotApi.replayOutbox().catch(ignore('PukuBotScreen'));
      }
    });
    const unsubOutbox = pukuBotOutbox.subscribe((entries, notice) => {
      setOutboxEntries(entries);
      if (notice) setOutboxNotice(notice);
    });
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active' && isAuthenticated) {
        pukuBotApi.replayOutbox().catch(ignore('PukuBotScreen'));
      }
    });
    if (isAuthenticated) {
      pukuBotApi.replayOutbox().catch(ignore('PukuBotScreen'));
    }
    return () => {
      unsubNet();
      unsubOutbox();
      appStateSub.remove();
    };
  }, [isAuthenticated]);

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

  const appendNotice = (text: string) => {
    setMessages(prev => [
      ...prev,
      { id: `notice_${Date.now()}`, role: 'assistant', text, notice: true },
    ]);
  };

  /**
   * Streams one reply into a new assistant bubble and resolves when the turn
   * ends (completed, failed, stopped or detached).
   */
  const followReply = (
    conversationId: string,
    start: (onEvent: (event: PukuBotTurnEvent) => void) => { detach: () => void }
  ): Promise<void> =>
    new Promise(resolve => {
      const assistantMsgId = `reply_${Date.now()}`;
      let text = '';
      const toolCalls: PukuBotToolCall[] = [];
      let settled = false;

      const update = () =>
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, text, toolCalls: [...toolCalls] } : m))
        );

      const finish = () => {
        if (settled) return;
        settled = true;
        if (activeStreamRef.current?.conversationId === conversationId) {
          activeStreamRef.current = null;
        }
        setIsStreaming(false);
        // Drop the bubble if the reply produced nothing to show.
        setMessages(prev =>
          prev.filter(
            m => m.id !== assistantMsgId || m.text.trim().length > 0 || (m.toolCalls?.length ?? 0) > 0
          )
        );
        resolve();
      };

      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', text: '', toolCalls: [] },
      ]);
      setIsStreaming(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

      const handle = start(event => {
        switch (event.type) {
          case 'message.delta':
            if (event.delta) {
              text += event.delta;
              update();
            }
            break;
          case 'message.completed':
            if (event.text) {
              text = event.text;
              update();
            }
            break;
          case 'tool.started':
            if (event.name && event.toolCallId) {
              toolCalls.push({
                id: event.toolCallId,
                name: event.name,
                arguments: event.arguments || {},
                status: 'pending',
              });
              update();
            }
            break;
          case 'tool.completed':
            if (event.toolCallId) {
              const existing = toolCalls.find(tc => tc.id === event.toolCallId);
              if (existing) {
                existing.status = 'completed';
                existing.result = event.result;
                update();
              }
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
            finish();
            break;
          case 'turn.failed': {
            const notice = describeTurnFailure(event);
            finish();
            if (notice) appendNotice(notice);
            break;
          }
        }
      });

      activeStreamRef.current = {
        conversationId,
        detach: () => {
          handle.detach();
          finish();
        },
      };
    });

  /**
   * Opens a conversation at once:
   * 1. Shows cached messages immediately from AsyncStorage.
   * 2. Fetches GET /conversations/:id/messages?limit=50 and replaces the cache and view.
   * 3. If offline, keeps cached messages and displays quiet notice without error popup.
   * 4. Resumes any active reply stream.
   */
  const openConversation = async (convId: string) => {
    if (openingConvIdRef.current === convId && activeConversation?.id === convId) return;
    openingConvIdRef.current = convId;
    activeStreamRef.current?.detach();
    setNeedsPerson(null);
    setPendingAttachment(null);
    setShowSkillsMenu(false);
    setHasMoreMessages(false);
    loadedBeforeIdsRef.current = new Set();

    if (!isAuthenticated) {
      const local = botConversations.find(c => c.id === convId);
      setActiveConversation(null);
      setMessages((local?.messages as LocalChatMessage[]) || []);
      return;
    }

    const known = serverConversations.find(c => c.id === convId);
    setActiveConversation(known || ({ id: convId, botId: null } as unknown as PukuBotConversation));
    if (known?.botId) setSelectedBotId(known.botId);

    // 1. Immediately show cached messages for that conversation from AsyncStorage
    const cacheKey = `@pukubot_messages_${convId}`;
    let hasCached = false;
    try {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (openingConvIdRef.current !== convId) return;
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(toLocalMessages(parsed));
          hasCached = true;
        }
      }
    } catch {}

    if (openingConvIdRef.current !== convId) return;
    if (!hasCached) {
      setMessages([]);
    }
    setIsLoadingThread(true);

    try {
      const res = await pukuBotApi.getMessages(convId, 50);
      if (openingConvIdRef.current !== convId) return;
      const loaded = toLocalMessages(res.messages || []);
      setMessages(loaded);
      setHasMoreMessages(Boolean(res.hasMore));
      setIsLoadingThread(false);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(res.messages || [])).catch(ignore('PukuBotScreen'));

      pukuBotApi.markConversationRead(convId).catch(ignore('PukuBotScreen'));
      setServerConversations(prev => prev.map(c => (c.id === convId ? { ...c, unread: false } : c)));

      if (res.answering) {
        await followReply(convId, onEvent => {
          const sub = pukuBotApi.resumeEventsStream(convId, onEvent);
          return { detach: sub.abort };
        });
        // The resumed stream only carries what happened after reconnecting.
        const fresh = await pukuBotApi.getMessages(convId, 50).catch(() => null);
        if (fresh && openingConvIdRef.current === convId) {
          setMessages(toLocalMessages(fresh.messages || []));
          setHasMoreMessages(Boolean(fresh.hasMore));
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fresh.messages || [])).catch(ignore('PukuBotScreen'));
        }
      }
    } catch (err: any) {
      if (openingConvIdRef.current !== convId) return;
      setIsLoadingThread(false);
      // Offline: if the request fails because there's no network, keep showing the cached messages
      // and a quiet "Offline — showing saved messages" line. Do not show an error popup.
      appendNotice('Offline — showing saved messages');
    }
  };

  const handleLoadOlderMessages = async () => {
    if (!activeConversation || !hasMoreMessages || isLoadingOlderMessages) return;
    const currentConvId = activeConversation.id;
    const oldestMsg = messages.find(m => !m.notice);
    const oldestId = oldestMsg?.id;
    if (!oldestId || loadedBeforeIdsRef.current.has(oldestId)) return;
    loadedBeforeIdsRef.current.add(oldestId);
    setIsLoadingOlderMessages(true);
    try {
      const res = await pukuBotApi.getMessages(currentConvId, 50, oldestId);
      if (openingConvIdRef.current !== currentConvId) return;
      const older = toLocalMessages(res.messages || []);
      setMessages(prev => [...older, ...prev]);
      setHasMoreMessages(Boolean(res.hasMore));
    } catch {
      // Quietly ignore pagination error
    } finally {
      if (openingConvIdRef.current === currentConvId) {
        setIsLoadingOlderMessages(false);
      }
    }
  };

  const handleListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y <= 15 && hasMoreMessages && !isLoadingOlderMessages) {
      handleLoadOlderMessages();
    }
  };

  const handleSelectRecentConv = (convId: string) => {
    selectBotConversation(convId);
    openConversation(convId);
  };

  // A drawer tap selects a conversation through AppContext.
  useEffect(() => {
    if (activeBotConversationId && activeBotConversationId !== openingConvIdRef.current) {
      openConversation(activeBotConversationId);
    }
    // openConversation reads the latest state on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBotConversationId]);

  /** Back to the home screen; the conversation is created on the first send. */
  const handleNewConversation = () => {
    activeStreamRef.current?.detach();
    openingConvIdRef.current = null;
    selectBotConversation(null);
    setActiveConversation(null);
    setMessages([]);
    setNeedsPerson(null);
    setPendingAttachment(null);
    setIsLoadingThread(false);
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

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend ?? inputVal).trim();
    if ((!raw && !pendingAttachment) || isStreaming) return;

    if (!pukuBotApi.isAuthenticated()) {
      handleConnectAuth();
      return;
    }

    const attachment = pendingAttachment;
    const { skill, body } = splitSkillCommand(raw, botSkills.map(s => s.slug));
    const displayText = raw || attachment?.name || '';

    setMessages(prev => [
      ...prev,
      { id: `user_${Date.now()}`, role: 'user', text: displayText, attachment: attachment || undefined },
    ]);
    setInputVal('');
    setPendingAttachment(null);
    setShowSkillsMenu(false);
    setIsStreaming(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let conv = activeConversation;
      if (!conv) {
        // No Bot picked: let the deployment route the first message.
        conv = await pukuBotApi.createConversation(
          botPickedByUser && serverBotId ? { botId: serverBotId } : { text: body || raw || displayText }
        );
        const created = conv;
        openingConvIdRef.current = created.id;
        setActiveConversation(created);
        selectBotConversation(created.id);
        if (created.botId) setSelectedBotId(created.botId);
        setServerConversations(prev => [created, ...prev.filter(c => c.id !== created.id)]);
      }
      const conversationId = conv.id;

      const uploaded: PukuBotAttachment[] = [];
      if (attachment) {
        const att = await pukuBotApi.uploadAttachment(conversationId, attachment);
        uploaded.push({ ...att, name: att.name || attachment.name, mimeType: att.mimeType || attachment.type });
      }

      // `botId` only matters in a conversation with several Bots, and must
      // name one of them.
      const answeringBotId =
        conv.botIds && conv.botIds.length > 1 && serverBotId && conv.botIds.includes(serverBotId)
          ? serverBotId
          : undefined;
      // A skill with nothing after it still needs some text to send.
      const text = skill ? body || raw : raw;

      await followReply(conversationId, onEvent =>
        pukuBotApi.sendMessageStream(conversationId, text, uploaded, onEvent, {
          botId: answeringBotId,
          skills: skill ? [skill] : undefined,
        })
      );
    } catch (err: any) {
      setIsStreaming(false);
      appendNotice(
        err?.message || t('pukuBot.sendFailed', { defaultValue: 'Message not sent. Please try again.' })
      );
    }
  };

  const handleStopStream = () => {
    const current = activeStreamRef.current;
    if (current) {
      pukuBotApi.stopTurn(current.conversationId).catch(ignore('PukuBotScreen'));
      current.detach();
    }
    setIsStreaming(false);
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

  // "Bot needs you": the Bot's computer is not part of the app, so hand the
  // person this conversation on the web, where they can take over.
  const handleTakeOver = () => {
    const convId = activeConversation?.id;
    const url = convId
      ? `${pukuBotApi.getWebOrigin()}/channel/${encodeURIComponent(convId)}`
      : pukuBotApi.getWebOrigin();
    Linking.openURL(url).catch(() =>
      Alert.alert(t('pukuBot.errorTitle'), `Could not open ${url}`)
    );
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
    const nextVal = !pinnedConvIds[convId];
    setPinnedConvIds(prev => ({ ...prev, [convId]: nextVal }));
    try {
      await pukuBotApi.pinConversation(convId, nextVal);
    } catch (err: any) {
      setPinnedConvIds(prev => ({ ...prev, [convId]: !nextVal }));
      Alert.alert(t('pukuBot.errorTitle'), err?.message || t('pukuBot.pinFailed', { defaultValue: 'Could not update the pin.' }));
    }
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
            try {
              await pukuBotApi.deleteConversation(convId);
            } catch (err: any) {
              Alert.alert(t('pukuBot.errorTitle'), err?.message || t('pukuBot.deleteFailed', { defaultValue: 'Could not delete this conversation.' }));
              return;
            }
            setServerConversations(prev => prev.filter(c => c.id !== convId));
            if (activeConversation?.id === convId) {
              handleNewConversation();
            }
          },
        },
      ]
    );
  };

  const handleSaveInstructions = async () => {
    if (instructionsText.length > MAX_INSTRUCTIONS_LENGTH) return;
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
      const created = await pukuBotApi.createMemory(newMemoryInput.trim(), shownMemoryBotId);
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

  /** Let another of their Bots remember it too. */
  const handleShareMemory = async (id: string, botId: string) => {
    try {
      await pukuBotApi.shareMemory(id, botId);
      setSharingMemoryId(null);
      const bot = availableBots.find(b => b.id === botId);
      Alert.alert('Shared', `${bot?.name || 'That Bot'} remembers this too now.`);
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
    if (!newSkillName.trim() || !newSkillPrompt.trim()) {
      Alert.alert(t('pukuBot.errorTitle'), 'A skill needs a title and instructions.');
      return;
    }
    try {
      const saved = await pukuBotApi.saveSkill(newSkillSlug.trim() || toSkillSlug(newSkillName), {
        title: newSkillName.trim(),
        instructions: newSkillPrompt.trim(),
      });
      setUserSkillsList(prev => prev.filter(s => s.slug !== saved.slug).concat(saved));
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
        if (!res.url) {
          throw new Error(t('pukuBot.connectNoUrl', { defaultValue: 'This account cannot be connected from the app yet.' }));
        }
        // The consent page returns to the deployment's own https link, not to
        // the app, so the browser may be closed by hand: what it reports says
        // nothing about whether the account was attached.
        const canAuth = await InAppBrowser.isAvailable().catch(() => false);
        if (canAuth) {
          await InAppBrowser.openAuth(res.url, ENV.PUKU_BOT_REDIRECT_URI || 'pukubot://auth/callback', {
            showTitle: false,
            enableDefaultShare: false,
            forceCloseOnRedirection: true,
          }).catch(ignore('PukuBotScreen'));
        } else {
          await Linking.openURL(res.url);
        }
        // A brokered app is attached only once the vendor confirms it; safe to ask again.
        if (conn.kind === 'brokered') {
          await pukuBotApi.confirmConnection(conn.id).catch(ignore('PukuBotScreen'));
        }
        // Show the server's state, not an assumed one.
        setConnectionsList(await pukuBotApi.getConnections());
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

  // Server conversations when signed in to Puku Bot, this device's otherwise.
  // Pinned first, then newest activity first.
  const botNameById = new Map(availableBots.map(b => [b.id, b.name]));
  const recentConversations = (
    isAuthenticated
      ? serverConversations.map(c => {
          const realName = c.botId ? botNameById.get(c.botId) : undefined;
          const subtitle =
            c.botName && realName && c.botName !== realName
              ? `${c.botName} · ${realName}`
              : c.botName || realName || '';
          const at = c.lastMessageAt || c.createdAt || '';
          return {
            id: c.id,
            title: c.title || t('pukuBot.untitledSession'),
            subtitle,
            time: (at && formatActivityDate(at)) || t('pukuBot.recent'),
            unread: !!c.unread,
            pinned: !!pinnedConvIds[c.id],
            sortAt: at,
          };
        })
      : botConversations.map(c => ({
          id: c.id,
          title: c.title || t('pukuBot.untitledSession'),
          subtitle: '',
          time: formatActivityDate(c.updatedAt || c.createdAt) || t('pukuBot.recent'),
          unread: false,
          pinned: false,
          sortAt: c.updatedAt || c.createdAt || '',
        }))
  )
    .sort((a, b) => (b.sortAt > a.sortAt ? 1 : b.sortAt < a.sortAt ? -1 : 0))
    // The home screen shows only the latest few; the drawer holds the full history,
    // and a conversation's messages load when it is opened.
    .slice(0, HOME_RECENT_LIMIT);

  const filteredBotSkills = (() => {
    const match = inputVal.match(/^\/(\S*)$/);
    if (!showSkillsMenu && !match) return [];
    const prefix = (match?.[1] || '').toLowerCase();
    return botSkills.filter(
      s => !prefix || s.slug.toLowerCase().startsWith(prefix) || (s.title || '').toLowerCase().includes(prefix)
    );
  })();

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
                accessibilityRole="button"
                onPress={handleTakeOver}
                style={[styles.needsPersonBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                <Text style={[styles.needsPersonBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                  {t('pukuBot.openOnWeb', { defaultValue: 'Open on web' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Chat thread, or the home page when no conversation is open */}
      {messages.length === 0 && !activeConversation ? (
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

            {recentConversations.length === 0 && (
              <View>
                <Text style={[styles.botRecentsEmpty, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {isAuthenticated
                    ? t('pukuBot.noConversations', { defaultValue: 'No conversations yet. Send a message to start one.' })
                    : t('pukuBot.signInForConversations', { defaultValue: 'Sign in to Puku Bot to see your conversations and chat.' })}
                </Text>
                {!isAuthenticated && (
                  <TouchableOpacity
                    onPress={handleConnectAuth}
                    disabled={isConnectingAuth}
                    style={[
                      styles.signInBtn,
                      {
                        backgroundColor: isDark ? '#35D6B4' : '#1A1D18',
                        marginTop: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                        borderRadius: 10,
                      },
                    ]}>
                    {isConnectingAuth ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.signInBtnText,
                          {
                            color: isDark ? '#141613' : '#FFFFFF',
                            fontFamily: monoFont,
                            fontWeight: '700',
                          },
                        ]}>
                        {t('pukuBot.signInButton', { defaultValue: 'Sign in to Puku Bot' })}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {recentConversations.map(conv => (
              <View key={conv.id}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={conv.title}
                  activeOpacity={0.7}
                  onPress={() => handleSelectRecentConv(conv.id)}
                  style={styles.botRecentItemRow}>
                  <View style={styles.botRecentTextWrap}>
                    <View style={styles.botRecentTitleRow}>
                      {conv.pinned && <PinIcon size={14} color="#35D6B4" />}
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          styles.botRecentItemTitle,
                          { color: theme.textPrimary, fontFamily: monoFont, fontWeight: conv.unread ? '700' : '500' },
                        ]}>
                        {conv.title}
                      </Text>
                    </View>
                    {!!conv.subtitle && (
                      <Text
                        numberOfLines={1}
                        style={[styles.botRecentSubtitle, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {conv.subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.botRecentRightWrap}>
                    {conv.unread && (
                      <View
                        accessibilityLabel={t('pukuBot.unread', { defaultValue: 'Unread' })}
                        style={[styles.unreadDot, { backgroundColor: '#35D6B4' }]}
                      />
                    )}
                    <Text style={[styles.botRecentItemTime, { color: theme.textMuted, fontFamily: monoFont }]}>
                      {conv.time}
                    </Text>
                    {isAuthenticated && (
                      <>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={conv.pinned ? 'Unpin conversation' : 'Pin conversation'}
                          onPress={() => handleTogglePin(conv.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.botRecentIconBtn}>
                          <PinIcon size={14} color={conv.pinned ? '#35D6B4' : theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Delete conversation"
                          onPress={() => handleDeleteConversation(conv.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.botRecentIconBtn}>
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
          {isLoadingThread && messages.length === 0 && (
            <View style={styles.threadLoader}>
              <ActivityIndicator size="small" color={theme.textMuted} />
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.flatList}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
            onScroll={handleListScroll}
            scrollEventThrottle={100}
            ListHeaderComponent={
              isLoadingOlderMessages ? (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.textMuted} />
                </View>
              ) : undefined
            }
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            renderItem={({ item, index }) => {
              if (item.notice) {
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
        {filteredBotSkills.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
            {filteredBotSkills.map(skill => (
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
                  {skill.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput
          ref={inputRef}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={!isDeviceOnline ? "You're offline" : t('pukuBot.composerPlaceholder')}
          placeholderTextColor={theme.placeholderText}
          multiline
          editable={isDeviceOnline}
          style={[
            styles.composerInput,
            {
              color: isDeviceOnline ? theme.textPrimary : theme.textMuted,
              fontFamily: monoFont,
            },
          ]}
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
              disabled={!isDeviceOnline || (!inputVal.trim() && !pendingAttachment)}
              onPress={() => handleSend()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: (isDeviceOnline && (inputVal.trim() || pendingAttachment))
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



      {/* Agents and Marketplace (drawer → Workspace) */}
      <PukuBotWorkspaceSheet
        visible={workspaceSheet !== null}
        panel={workspaceSheet ?? 'agents'}
        onChangePanel={setWorkspaceSheet}
        onClose={() => setWorkspaceSheet(null)}
        onStartChat={handleStartChatWith}
      />

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

            {outboxEntries.length > 0 && (
              <View
                style={{
                  marginVertical: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#1C271E' : '#E9F5EB',
                  borderWidth: 1,
                  borderColor: isDark ? '#2D5E37' : '#BEE2C7',
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isDark ? '#94C7A0' : '#2D7543',
                    fontFamily: monoFont,
                  }}>
                  {outboxEntries.length === 1
                    ? '1 change waiting to sync'
                    : `${outboxEntries.length} changes waiting to sync`}
                </Text>
              </View>
            )}

            {!!outboxNotice && (
              <View
                style={{
                  marginVertical: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#2E1A1A' : '#FDECEC',
                  borderWidth: 1,
                  borderColor: isDark ? '#5E2D2D' : '#F5C2C2',
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? '#F87171' : '#DC2626',
                    fontFamily: monoFont,
                  }}>
                  {outboxNotice}
                </Text>
              </View>
            )}

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
                  {outboxEntries.some(e => e.path === '/settings/instructions') && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Personal instructions on how your Bots should talk to you (tone, brevity, formatting):
                  </Text>
                  <TextInput
                    value={instructionsText}
                    onChangeText={setInstructionsText}
                    maxLength={MAX_INSTRUCTIONS_LENGTH}
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
                      {instructionsText.length}/{MAX_INSTRUCTIONS_LENGTH} chars
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
                    What your Bots remember about you and your work. The Bot reads these at the top of every turn.
                  </Text>
                  {/* Memory is per Bot: pick whose */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
                    {availableBots.map(bot => {
                      const isActive = bot.id === shownMemoryBotId;
                      return (
                        <TouchableOpacity
                          key={bot.id}
                          accessibilityRole="button"
                          onPress={() => {
                            setMemoryBotId(bot.id);
                            setSharingMemoryId(null);
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: isActive ? '#35D6B4' : theme.border,
                            backgroundColor: isActive ? 'rgba(53, 214, 180, 0.15)' : 'transparent',
                          }}>
                          <Text style={{ fontSize: 11.5, color: isActive ? '#35D6B4' : theme.textSecondary, fontFamily: monoFont }}>
                            {bot.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TextInput
                      value={newMemoryInput}
                      onChangeText={setNewMemoryInput}
                      maxLength={1000}
                      placeholder="A fact the Bot should know..."
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
                        Remember
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isLoadingMemories && memoriesList.length === 0 ? (
                    <ActivityIndicator color="#35D6B4" style={{ marginVertical: 12 }} />
                  ) : memoriesList.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                      Nothing remembered yet. Add a fact the Bot should know.
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
                        {(mem.id.startsWith('mem_') || outboxEntries.some(e => e.path.includes(mem.id))) && (
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 4 }}>
                            <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <Text style={{ fontSize: 10.5, color: theme.textMuted, fontFamily: monoFont }}>
                            {mem.kind || 'fact'}
                            {mem.useCount ? ` · used ${mem.useCount}×` : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {availableBots.length > 1 && !mem.id.startsWith('mem_') && (
                              <TouchableOpacity
                                accessibilityRole="button"
                                onPress={() => setSharingMemoryId(prev => (prev === mem.id ? null : mem.id))}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: sharingMemoryId === mem.id ? '#35D6B4' : theme.border,
                                }}>
                                <Text style={{ fontSize: 10.5, color: sharingMemoryId === mem.id ? '#35D6B4' : theme.textMuted, fontFamily: monoFont }}>
                                  Share with…
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Forget" onPress={() => handleDeleteMemory(mem.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                              <TrashIcon size={14} color="#FF4D4F" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {sharingMemoryId === mem.id && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {availableBots
                              .filter(b => b.id !== shownMemoryBotId)
                              .map(b => (
                                <TouchableOpacity
                                  key={b.id}
                                  accessibilityRole="button"
                                  onPress={() => handleShareMemory(mem.id, b.id)}
                                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                                  <Text style={{ fontSize: 11, color: theme.textPrimary, fontFamily: monoFont }}>{b.name}</Text>
                                </TouchableOpacity>
                              ))}
                          </View>
                        )}
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
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                              {rt.instruction}
                            </Text>
                            {outboxEntries.some(e => e.path.includes(rt.id)) && (
                              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 2 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                              </View>
                            )}
                          </View>
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
                          Schedule: {rt.schedule}{rt.timezone ? ` (${rt.timezone})` : ''}
                        </Text>
                        {rt.nextRunAt ? (
                          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                            Next run: {new Date(rt.nextRunAt).toLocaleString()}
                          </Text>
                        ) : null}
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
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, fontFamily: monoFont }}>
                    A skill is a named instruction you invoke with / and a Bot follows. Yours are yours alone, and go on the Bots you own.
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, fontFamily: monoFont }}>
                      Your skills
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowAddSkillForm(prev => !prev)}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }}>
                      <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
                        {showAddSkillForm ? 'Cancel' : '+ New skill'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showAddSkillForm && (
                    <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#35D6B4', marginBottom: 12, backgroundColor: theme.secondaryBackground }}>
                      <TextInput
                        value={newSkillName}
                        onChangeText={setNewSkillName}
                        maxLength={120}
                        placeholder="Title (e.g. Translate to French)"
                        placeholderTextColor={theme.placeholderText}
                        style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                      />
                      <TextInput
                        value={newSkillSlug}
                        onChangeText={text => setNewSkillSlug(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={40}
                        placeholder={`/${toSkillSlug(newSkillName) || 'slug'} (from the title)`}
                        placeholderTextColor={theme.placeholderText}
                        style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                      />
                      <TextInput
                        value={newSkillPrompt}
                        onChangeText={setNewSkillPrompt}
                        multiline
                        placeholder="Instructions the Bot follows"
                        placeholderTextColor={theme.placeholderText}
                        style={{ minHeight: 80, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, paddingTop: 8, marginBottom: 8, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont, textAlignVertical: 'top' }}
                      />
                      <TouchableOpacity
                        onPress={handleSaveSkill}
                        style={{ height: 34, borderRadius: 6, backgroundColor: '#35D6B4', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#141613', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                          Save skill
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(() => {
                    const renderSkill = (skill: PukuBotSkill, editable: boolean) => (
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
                          <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 12.5, fontFamily: monoFont }}>
                            {skill.title}
                          </Text>
                          {outboxEntries.some(e => e.path.includes(skill.slug)) && (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 2 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                            </View>
                          )}
                          <Text style={{ color: '#35D6B4', fontSize: 12, marginTop: 2, fontFamily: monoFont }}>
                            /{skill.slug}
                          </Text>
                          {skill.summary ? (
                            <Text numberOfLines={2} style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                              {skill.summary}
                            </Text>
                          ) : null}
                        </View>
                        {editable && (
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete /${skill.slug}`} onPress={() => handleDeleteSkill(skill.slug)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <TrashIcon size={14} color="#FF4D4F" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                    const mine = userSkillsList.filter(s => s.mine !== false && !s.deployment);
                    const workspace = userSkillsList.filter(s => s.deployment);
                    return (
                      <>
                        {mine.length === 0 ? (
                          <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 10, fontFamily: monoFont }}>
                            You don&apos;t have any skills yet.
                          </Text>
                        ) : (
                          mine.map(skill => renderSkill(skill, true))
                        )}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 12, fontFamily: monoFont }}>
                          Workspace skills
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, marginBottom: 8, fontFamily: monoFont }}>
                          Written for everyone by an administrator. Change them on the web.
                        </Text>
                        {workspace.length === 0 ? (
                          <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 10, fontFamily: monoFont }}>
                            No workspace skills.
                          </Text>
                        ) : (
                          workspace.map(skill => renderSkill(skill, false))
                        )}
                      </>
                    );
                  })()}
                </View>
              )}

              {/* TAB 6: Connected Accounts */}
              {activeSettingsTab === 'connections' && (
                <View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                    Services a Bot reads as you, so it sees exactly what you can see:
                  </Text>
                  {connectionsNotice ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                      {connectionsNotice}
                    </Text>
                  ) : connectionsList.length === 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                      No services to connect yet. An administrator adds them on the web.
                    </Text>
                  ) : null}
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
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                          {conn.name}
                        </Text>
                        {conn.vendor || conn.summary ? (
                          <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                            {[conn.vendor, conn.summary].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
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
                      setBotPickedByUser(true);
                      setShowBotModal(false);
                      // A conversation belongs to its Bot: picking another starts a new one.
                      if (activeConversation && activeConversation.botId !== bot.id) {
                        handleNewConversation();
                      }
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
    flexShrink: 1,
    fontSize: 14,
  },
  botRecentTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  botRecentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botRecentSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  botRecentIconBtn: {
    padding: 4,
  },
  botRecentsEmpty: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 16,
  },
  botShowMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  threadLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noticeRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
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
