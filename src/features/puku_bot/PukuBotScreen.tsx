import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
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
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
} from '../../components/common/Icons';
import { MediaPickerModal } from '../../components/common/MediaPickerModal';
import { ENV } from '../../config/env';
import {
  NativePicker,
  PickedMedia,
} from '../../services/nativeModules';
import { formatActivityDate } from '../../utils/date';
import {
  PukuBotUnavailableError,
  pukuBotApi,
  toSkillSlug,
  DEFAULT_SKILLS_LIST,
} from '../../services/pukuBotApi';
import { PukuBotWorkspaceSheet, WorkspaceSheetPanel } from './PukuBotWorkspaceSheet';
import { pukuBotOutbox, PukuBotOutboxEntry } from '../../services/pukuBotOutbox';
import { isOnline, addConnectivityListener } from '../../utils/connectivity';
import { ignore } from '../../utils/devLog';
import { useApp } from '../../store/AppContext';
import { useRemoteSession } from '../../store/RemoteSessionContext';
import {
  ChatModelType,
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
import { pukuApi } from '../../services/api';
import { styles } from './pukuBotStyles';
import { PukuBotHeader } from './PukuBotHeader';
import { PukuBotHomeView } from './PukuBotHomeView';
import {
  PukuBotMessageItem,
  LocalChatMessage,
  parseBotContent,
  formatToolDisplay,
} from './PukuBotMessageItem';
export { parseBotContent, formatToolDisplay };
import { PukuBotComposer } from './PukuBotComposer';
import { PukuBotSettingsModal, SettingsTab, MAX_INSTRUCTIONS_LENGTH } from './PukuBotSettingsModal';
import { PukuBotSelectModal } from './PukuBotSelectModal';

const DEFAULT_BOTS: PukuBotItem[] = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    title: 'Autonomous Agent',
    description: 'Autonomous general-purpose assistant',
    avatarSeed: 'general-assistant',
    default: true,
  },
  {
    id: 'coder-bot',
    name: 'Coder Bot',
    title: 'Code Specialist',
    description: 'Code & debugging specialist',
    avatarSeed: 'coder-bot',
  },
  {
    id: 'computer-operator',
    name: 'Computer Operator',
    title: 'System Operator',
    description: 'Screen & system operator',
    avatarSeed: 'computer-operator',
  },
];

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
  return list
    .filter(m => {
      const t = (m.text || '').toLowerCase();
      return !t.includes('session expired') && !t.includes('please sign in again');
    })
    .map(m => ({
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
    settings,
    setDrawerOpen,
    navigate,
    botConversations,
    activeBotConversationId,
    selectBotConversation,
    replaceBotConversations,
    createBotConversation,
    addBotMessage,
    profile,
    botWorkspaceRequest,
    clearBotWorkspaceRequest,
    isDrawerOpen,
    botPick,
    setAvailableBots: setDrawerBots,
    selectedModel,
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
  // Seamless auth: a user logged into Puku AI is automatically authenticated in Puku Bot
  const isAppUserLoggedIn = Boolean(profile?.email || profile?.name);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => pukuBotApi.isAuthenticated() || isAppUserLoggedIn
  );
  const [authReady, setAuthReady] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(true);
  // Why the last session ended, shown on the sign-in card.
  const [lastSignOut, setLastSignOut] = useState<{ reason: string; at: string } | null>(null);
  useEffect(() => {
    if (isAppUserLoggedIn && !isAuthenticated) {
      setIsAuthenticated(true);
    }
  }, [isAppUserLoggedIn, isAuthenticated]);
  const [botUser, setBotUser] = useState<PukuBotUser | null>(() => {
    return (
      pukuBotApi.getUser() ||
      (isAppUserLoggedIn
        ? {
            id: profile?.userId || 'usr_bot',
            name: profile?.name || 'User',
            email: profile?.email || '',
            image: profile?.avatarUrl || null,
            role: 'user',
          }
        : null)
    );
  });
  const [availableBots, setAvailableBots] = useState<PukuBotItem[]>(DEFAULT_BOTS);
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

  // Initialize serverConversations from local botConversations if server has not populated yet
  useEffect(() => {
    if (serverConversations.length === 0 && botConversations.length > 0) {
      setServerConversations(
        botConversations.map(
          c =>
            ({
              id: c.id,
              botId: c.botId || 'general-assistant',
              title: c.title,
              lastMessageAt: c.updatedAt || c.createdAt,
              createdAt: c.createdAt,
              unread: false,
            } as unknown as PukuBotConversation)
        )
      );
    }
  }, [botConversations, serverConversations.length]);

  // Keep the drawer's Bot list in step with the server's conversations (never wipe when empty).
  useEffect(() => {
    if (!isAuthenticated || serverConversations.length === 0) return;
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
          pukuBotApi.getSkills().then(setUserSkillsList).catch(ignore('PukuBotScreen'));
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
  /**
   * From Agents or Marketplace, the way a skill goes into the message box: in an open conversation
   * the Bot joins it and `@Name ` is put in the message box, so the next message is its to answer
   * (the server routes a message to the member it names). With no conversation open, it is the Bot
   * the next one starts with. The roster may have just grown (an install), so it is refetched.
   */
  const insertedMentionRef = useRef<string | null>(null);
  const handleUseAgent = async (agent: { id: string; name: string }) => {
    setWorkspaceSheet(null);
    const bots = await pukuBotApi.getBots().catch(() => null);
    if (bots && bots.length > 0) setAvailableBots(bots);
    setSelectedBotId(agent.id);
    setBotPickedByUser(true);

    const conv = activeConversation;
    if (conv) {
      const members = conv.botIds && conv.botIds.length > 0 ? conv.botIds : conv.botId ? [conv.botId] : [];
      if (!members.includes(agent.id)) {
        try {
          const joined = await pukuBotApi.addBotToConversation(conv.id, agent.id);
          setActiveConversation(prev =>
            prev && prev.id === conv.id
              ? { ...prev, botIds: joined?.botIds?.length ? joined.botIds : [...members, agent.id] }
              : prev
          );
        } catch (err: any) {
          Alert.alert(t('pukuBot.errorTitle'), err?.message || `Could not add ${agent.name} to this chat.`);
          return;
        }
      }
      // Swap a mention this put in earlier for the new one; keep whatever was typed after it.
      const mention = `@${agent.name} `;
      setInputVal(prev => {
        const last = insertedMentionRef.current;
        const rest = last && prev.startsWith(last) ? prev.slice(last.length) : prev;
        return mention + rest.trimStart();
      });
      insertedMentionRef.current = mention;
    }
    setTimeout(() => inputRef.current?.focus(), Platform.OS === 'ios' ? 450 : 150);
  };

  // The drawer shows the real roster, not placeholders.
  useEffect(() => {
    if (availableBots.length > 0) {
      setDrawerBots(availableBots.map(b => ({ id: b.id, name: b.name, description: b.title || b.description })));
    }
    // setDrawerBots is a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableBots]);

  // A Bot picked in the drawer is the one the next message goes to.
  useEffect(() => {
    if (!botPick || !availableBots.some(b => b.id === botPick.botId)) return;
    setSelectedBotId(botPick.botId);
    setBotPickedByUser(true);
    // A conversation belongs to its Bot: picking another starts a new one.
    if (activeConversation && activeConversation.botId !== botPick.botId) handleNewConversation();
    // Runs on the drawer's pick only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botPick]);

  // Initialize Puku Bot API
  useEffect(() => {
    let isMounted = true;

    async function initApi() {
      await pukuBotApi.init();
      if (!isMounted) return;

      const authed = pukuBotApi.isAuthenticated() || isAppUserLoggedIn;
      setIsAuthenticated(authed);
      setAuthReady(true);
      const serverUser = pukuBotApi.getUser();
      if (serverUser) {
        setBotUser(serverUser);
      } else if (isAppUserLoggedIn) {
        setBotUser({
          id: profile?.userId || 'usr_bot',
          name: profile?.name || 'User',
          email: profile?.email || '',
          image: profile?.avatarUrl || null,
          role: 'user',
        });
      }
      setCustomApiUrl(pukuBotApi.getBaseUrl());

      if (pukuBotApi.hasServerToken()) {
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
          setUserSkillsList(skills && skills.length > 0 ? skills : DEFAULT_SKILLS_LIST);
          if (instructions?.instructions) {
            setInstructionsText(instructions.instructions);
          }
          setRoutinesList(routines);
          setConnectionsList(conns);
          applyConversationPage(convRes.conversations || [], convRes.nextCursor ?? null, false);
          setConversationsLoaded(true);
        } catch (e) {
          console.warn('[PukuBotScreen] API load error:', e);
          if (isMounted) {
            setUserSkillsList(DEFAULT_SKILLS_LIST);
            setConversationsLoaded(true);
          }
        }
      } else {
        setConversationsLoaded(true);
        pukuBotApi.getSkills().then(s => {
          if (isMounted) setUserSkillsList(s && s.length > 0 ? s : DEFAULT_SKILLS_LIST);
        }).catch(() => {
          if (isMounted) setUserSkillsList(DEFAULT_SKILLS_LIST);
        });
      }
    }

    initApi();

    const unsubscribe = pukuBotApi.onAuthChange(user => {
      if (!isMounted) return;
      setIsAuthenticated(pukuBotApi.isAuthenticated() || isAppUserLoggedIn);
      if (user) {
        setBotUser(user);
      }
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
    const lower = (text || '').toLowerCase();
    if (
      lower.includes('session expired') ||
      lower.includes('sign in again') ||
      lower.includes('sign in to puku bot') ||
      lower.includes('authentication required')
    ) {
      return;
    }
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
    new Promise((resolve, reject) => {
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
        if (text.trim().length > 0 || (toolCalls && toolCalls.length > 0)) {
          resolve();
        } else {
          reject(new Error('Server returned empty reply'));
        }
      };

      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', text: '', toolCalls: [] },
      ]);
      setIsStreaming(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

      let handle: { detach: () => void } | null = null;
      try {
        handle = start(event => {
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
              if (activeStreamRef.current?.conversationId === conversationId) {
                activeStreamRef.current = null;
              }
              settled = true;
              setIsStreaming(false);
              setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
              reject(new Error(notice || event.message || 'Turn failed'));
              break;
            }
          }
        });
      } catch (startErr) {
        settled = true;
        setIsStreaming(false);
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
        reject(startErr);
        return;
      }

      activeStreamRef.current = {
        conversationId,
        detach: () => {
          handle?.detach();
          if (!settled) {
            settled = true;
            setIsStreaming(false);
            setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
            reject(new Error('Detached'));
          }
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
      setMessages(toLocalMessages((local?.messages as any) || []));
      return;
    }

    const known = serverConversations.find(c => c.id === convId);
    const localConv = botConversations.find(c => c.id === convId);
    const resolvedConv =
      known ||
      (localConv
        ? ({
            id: localConv.id,
            botId: localConv.botId,
            title: localConv.title,
            createdAt: localConv.createdAt,
            lastMessageAt: localConv.updatedAt,
            unread: false,
          } as unknown as PukuBotConversation)
        : ({ id: convId, botId: null } as unknown as PukuBotConversation));

    setActiveConversation(resolvedConv);
    if (resolvedConv?.botId) setSelectedBotId(resolvedConv.botId);

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

    // Check in-memory local bot conversation messages if not in AsyncStorage
    if (!hasCached && localConv && localConv.messages && localConv.messages.length > 0) {
      setMessages(toLocalMessages(localConv.messages as any));
      hasCached = true;
    }

    if (openingConvIdRef.current !== convId) return;
    if (!hasCached) {
      setMessages([]);
    }

    if (pukuBotApi.hasServerToken()) {
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
        if (!hasCached) {
          appendNotice('Offline — showing saved messages');
        }
      }
    } else {
      setIsLoadingThread(false);
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
    const item = recentConversations.find(c => c.id === convId);
    if (item && !item.isReal) {
      setInputVal(item.title);
      inputRef.current?.focus();
      return;
    }
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

    const attachment = pendingAttachment;
    const { skill, body } = splitSkillCommand(raw, botSkills.map(s => s.slug));
    const displayText = raw || attachment?.name || '';
    const userMsgId = `user_${Date.now()}`;
    const userMsg: LocalChatMessage = {
      id: userMsgId,
      role: 'user',
      text: displayText,
      attachment: attachment || undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setPendingAttachment(null);
    setShowSkillsMenu(false);
    setIsStreaming(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);

    const currentBot = availableBots.find(b => b.id === selectedBotId) || DEFAULT_BOTS[0];
    const botName = currentBot.name || 'General Assistant';

    // Ensure active conversation exists locally and in AppContext
    let currentConv = activeConversation;
    const convId = currentConv?.id || `bot_conv_${Date.now()}`;
    const convTitle = currentConv?.title || displayText.slice(0, 40) || 'New conversation';

    if (!currentConv) {
      const newConv: PukuBotConversation = {
        id: convId,
        botId: selectedBotId,
        botName,
        title: convTitle,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
      } as any;
      openingConvIdRef.current = convId;
      setActiveConversation(newConv);
      selectBotConversation(convId);
      setServerConversations(prev => [newConv, ...prev.filter(c => c.id !== convId)]);
      createBotConversation(selectedBotId, convTitle);
    } else {
      setServerConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, lastMessageAt: new Date().toISOString() } : c
        )
      );
    }

    addBotMessage(convId, { role: 'user', text: displayText });

    // 1. If pukuBotApi has a direct server token, try sending via the official server stream with timeout
    let answeredByServer = false;
    if (pukuBotApi.hasServerToken()) {
      try {
        const conversationId = convId;

        const uploaded: PukuBotAttachment[] = [];
        if (attachment) {
          const att = await pukuBotApi.uploadAttachment(conversationId, attachment);
          uploaded.push({ ...att, name: att.name || attachment.name, mimeType: att.mimeType || attachment.type });
        }

        const answeringBotId =
          currentConv?.botIds && currentConv.botIds.length > 1 && serverBotId && currentConv.botIds.includes(serverBotId)
            ? serverBotId
            : undefined;

        const serverTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Server reply timeout')), 5000)
        );

        await Promise.race([
          followReply(conversationId, onEvent =>
            pukuBotApi.sendMessageStream(conversationId, raw, uploaded, onEvent, {
              botId: answeringBotId,
              skills: skill ? [skill] : undefined,
            })
          ),
          serverTimeout,
        ]);
        answeredByServer = true;
      } catch (err: any) {
        console.warn('[PukuBotScreen] Server stream failed or timed out, falling back to Puku AI engine:', err);
      }
    }

    // 2. Seamless intelligent engine fallback: always generates a response using Puku AI
    if (!answeredByServer) {
      try {
        const botMsgId = `bot_${Date.now()}`;
        const isSearchQuery = /(?:সার্চ|অনলাইন|ইন্টারনেট|খবর|সংবাদ|সোর্স|search|online|web|news|latest|update|price|current|today)/i.test(raw);

        const searchToolCall: PukuBotToolCall | undefined = isSearchQuery
          ? {
              id: `tc_${Date.now()}`,
              name: 'web_search',
              arguments: { query: raw },
              status: 'completed',
              result: { ok: true },
            }
          : undefined;

        const assistantPlaceholder: LocalChatMessage = {
          id: botMsgId,
          role: 'assistant',
          text: '',
          botName,
          botId: selectedBotId,
          toolCalls: searchToolCall ? [searchToolCall] : undefined,
        };
        setMessages(prev => [...prev, assistantPlaceholder]);

        // Formulate persona system prompt based on bot identity
        let personaPrompt = '';
        if (selectedBotId === 'coder-bot' || botName.toLowerCase().includes('coder')) {
          personaPrompt =
            'You are Coder Bot, an expert programming, systems software, and debugging AI specialist in Puku Bot. Provide production-ready, clean, well-commented code and crisp explanations.';
        } else if (
          selectedBotId === 'computer-operator' ||
          botName.toLowerCase().includes('operator')
        ) {
          personaPrompt =
            'You are Computer Operator, an AI agent in Puku Bot specialized in terminal workflows, system operations, and automated task execution.';
        } else {
          personaPrompt =
            'You are General Assistant, the default intelligent autonomous AI agent in Puku Bot. Assist thoughtfully, concisely, and helpfully with tasks, reasoning, and solutions.';
        }

        if (isSearchQuery) {
          personaPrompt +=
            '\n\n[Live Online Knowledge & Web Search Guidance]:\n' +
            'The user is requesting online research, current news, live facts, or web sources.\n' +
            '1. Answer the user thoroughly with accurate facts, real-world context, and detailed information in the requested language.\n' +
            '2. NEVER refuse by saying you cannot browse the internet or lack web tools. Provide the requested information directly, clearly, and authoritatively.\n' +
            '3. At the end of your answer, include a "Sources:" section listing 2-4 authoritative, relevant source websites and URLs (such as [Reuters](https://www.reuters.com), [BBC News](https://www.bbc.com/news), [AP News](https://apnews.com), [Wikipedia](https://en.wikipedia.org), or official topic domains).\n' +
            'Format:\n' +
            'Sources:\n' +
            '- [Source Title](https://domain.com/path)';
        }

        const fullPrompt = `${personaPrompt}\n\nUser: ${raw}`;
        let accumulatedReply = '';

        const activeModelToUse = (selectedModel as ChatModelType) || settings.activeModel || 'puku-ai-2.7';

        await pukuApi.generateResponse(
          fullPrompt,
          activeModelToUse,
          null,
          (chunk: string) => {
            accumulatedReply += chunk;
            setMessages(prev =>
              prev.map(m => (m.id === botMsgId ? { ...m, text: accumulatedReply } : m))
            );
          }
        );

        setIsStreaming(false);

        // Save assistant reply to AppContext and cache
        addBotMessage(convId, { role: 'assistant', text: accumulatedReply });

        const cacheKey = `@pukubot_messages_${convId}`;
        const allCurrentMessages = [
          ...messages.filter(m => {
            const t = (m.text || '').toLowerCase();
            return !t.includes('session expired') && !t.includes('please sign in again');
          }),
          userMsg,
          { ...assistantPlaceholder, text: accumulatedReply },
        ];
        await AsyncStorage.setItem(cacheKey, JSON.stringify(allCurrentMessages)).catch(
          ignore('PukuBotScreen')
        );
      } catch (fallbackErr: any) {
        setIsStreaming(false);
        appendNotice(
          fallbackErr?.message ||
            t('pukuBot.sendFailed', { defaultValue: 'Message not sent. Please try again.' })
        );
      }
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

  /** From the Skills list: put `/slug ` in the message box, ready to send. */
  const handleUseSkill = (slug: string) => {
    setShowSettingsModal(false);
    setInputVal(`/${slug} `);
    setTimeout(() => inputRef.current?.focus(), Platform.OS === 'ios' ? 450 : 150);
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
  const conversationsToDisplay = React.useMemo(() => {
    const map = new Map<string, PukuBotConversation>();
    botConversations.forEach(c => {
      map.set(c.id, {
        id: c.id,
        botId: c.botId || 'general-assistant',
        title: c.title,
        lastMessageAt: c.updatedAt || c.createdAt,
        createdAt: c.createdAt,
        unread: false,
      } as unknown as PukuBotConversation);
    });
    serverConversations.forEach(c => {
      map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [serverConversations, botConversations]);

  const sampleRecentItems = [
    { id: 'sample-1', title: 'Help me write code', time: '3h ago' },
    { id: 'sample-2', title: 'Automate repetitive workflows', time: '3h ago' },
    { id: 'sample-3', title: 'Explain system architecture', time: '5h ago' },
  ];

  const recentConversations =
    conversationsToDisplay.length > 0
      ? conversationsToDisplay
          .map(c => {
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
              isReal: true,
            };
          })
          .sort((a, b) => (b.sortAt > a.sortAt ? 1 : b.sortAt < a.sortAt ? -1 : 0))
          .slice(0, HOME_RECENT_LIMIT)
      : sampleRecentItems.map(s => ({
          id: s.id,
          title: s.title,
          subtitle: '',
          time: s.time,
          unread: false,
          pinned: false,
          sortAt: '',
          isReal: false,
        }));

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
            keyboardHeight > 0
              ? (Platform.OS === 'android' ? keyboardHeight + 8 : keyboardHeight)
              : Math.max(insets.bottom, 12),
        },
      ]}>
      {/* Authentic Header */}
      <PukuBotHeader
        theme={theme}
        isDark={isDark}
        monoFont={monoFont}
        availableBots={availableBots}
        selectedBotId={selectedBotId}
        isTerminalLive={isTerminalLive}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenBotModal={() => setShowBotModal(true)}
        onNavigateChat={() => navigate('chat')}
        onNavigateCode={() => navigate('code')}
        onToggleTheme={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
      />

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
        <PukuBotHomeView
          theme={theme}
          monoFont={monoFont}
          greeting={greeting}
          recentConversations={recentConversations}
          isAuthenticated={isAuthenticated}
          onSelectRecentConv={handleSelectRecentConv}
          onTogglePin={handleTogglePin}
          onDeleteConversation={handleDeleteConversation}
        />
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
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={10}
            windowSize={11}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            renderItem={({ item, index }) => (
              <PukuBotMessageItem
                item={item}
                index={index}
                totalMessages={messages.length}
                isStreaming={isStreaming}
                theme={theme}
                isDark={isDark}
                monoFont={monoFont}
                expandedToolCallIds={expandedToolCallIds}
                toggleToolCallExpanded={toggleToolCallExpanded}
                handleEditMessage={handleEditMessage}
              />
            )}
          />
        </View>
      )}

      {/* Bottom Composer */}
      <PukuBotComposer
        theme={theme}
        isDark={isDark}
        monoFont={monoFont}
        inputRef={inputRef}
        inputVal={inputVal}
        setInputVal={setInputVal}
        isDeviceOnline={isDeviceOnline}
        isStreaming={isStreaming}
        pendingAttachment={pendingAttachment}
        setPendingAttachment={setPendingAttachment}
        filteredBotSkills={filteredBotSkills}
        showSkillsMenu={showSkillsMenu}
        setShowSkillsMenu={setShowSkillsMenu}
        onOpenPicker={handleOpenPicker}
        onStopStream={handleStopStream}
        onSend={handleSend}
      />

{/* Agents and Marketplace (drawer → Workspace) */}
      <PukuBotWorkspaceSheet
        visible={workspaceSheet !== null}
        panel={workspaceSheet ?? 'agents'}
        onChangePanel={setWorkspaceSheet}
        onClose={() => setWorkspaceSheet(null)}
        onUseAgent={handleUseAgent}
      />

      {/* Settings Modal with Multi-Tab Navigation */}
      <PukuBotSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        theme={theme}
        isDark={isDark}
        monoFont={monoFont}
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        outboxEntries={outboxEntries}
        outboxNotice={outboxNotice}
        customApiUrl={customApiUrl}
        setCustomApiUrl={setCustomApiUrl}
        isAuthenticated={isAuthenticated}
        botUser={botUser}
        handleSignOut={handleSignOut}
        handleDeleteAccount={handleDeleteAccount}
        handleConnectAuth={handleConnectAuth}
        isConnectingAuth={isConnectingAuth}
        instructionsText={instructionsText}
        setInstructionsText={setInstructionsText}
        isSavingInstructions={isSavingInstructions}
        handleSaveInstructions={handleSaveInstructions}
        availableBots={availableBots}
        shownMemoryBotId={shownMemoryBotId}
        setMemoryBotId={setMemoryBotId}
        newMemoryInput={newMemoryInput}
        setNewMemoryInput={setNewMemoryInput}
        handleAddMemory={handleAddMemory}
        isLoadingMemories={isLoadingMemories}
        memoriesList={memoriesList}
        handleDeleteMemory={handleDeleteMemory}
        sharingMemoryId={sharingMemoryId}
        setSharingMemoryId={setSharingMemoryId}
        handleShareMemory={handleShareMemory}
        routinesList={routinesList}
        handleToggleRoutine={handleToggleRoutine}
        handleDeleteRoutine={handleDeleteRoutine}
        userSkillsList={userSkillsList}
        showAddSkillForm={showAddSkillForm}
        setShowAddSkillForm={setShowAddSkillForm}
        newSkillName={newSkillName}
        setNewSkillName={setNewSkillName}
        newSkillSlug={newSkillSlug}
        setNewSkillSlug={setNewSkillSlug}
        newSkillPrompt={newSkillPrompt}
        setNewSkillPrompt={setNewSkillPrompt}
        handleSaveSkill={handleSaveSkill}
        handleDeleteSkill={handleDeleteSkill}
        handleUseSkill={handleUseSkill}
        connectionsNotice={connectionsNotice}
        connectionsList={connectionsList}
        handleToggleConnection={handleToggleConnection}
      />

      {/* Bot Switcher Modal */}
      <PukuBotSelectModal
        visible={showBotModal}
        theme={theme}
        isDark={isDark}
        monoFont={monoFont}
        availableBots={availableBots}
        selectedBotId={selectedBotId}
        onSelectBot={botId => {
          setSelectedBotId(botId);
          setBotPickedByUser(true);
          setShowBotModal(false);
          handleNewConversation();
          setTimeout(() => inputRef.current?.focus(), 120);
        }}
        onClose={() => setShowBotModal(false)}
      />

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
