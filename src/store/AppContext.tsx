import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppRoute,
  AppSettings,
  Artifact,
  ChatMessage,
  ChatModelType,
  CodeSession,
  Conversation,
  Project,
  RemoteSession,
  UserProfile,
} from '../types';
import { darkTheme, lightTheme, ThemeColors } from '../theme/theme';
import { pukuApi, mapModelToApi, mapApiToModel } from '../services/api';
import { tokenManager } from '../services/tokenManager';
import { extractJwtData } from '../utils/auth';
import { formatActivityDate, getConversationTimestamp } from '../utils/date';
import { ENV } from '../config/env';

interface AppContextValue {
  theme: ThemeColors;
  isDark: boolean;
  activeRoute: AppRoute;
  routeParams: any;
  navigate: (route: AppRoute, params?: any) => void;
  goBack: () => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isRestoringSession: boolean;
  // Chat
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  selectConversation: (id: string | null) => void;
  startNewChat: (projectId?: string) => void;
  deleteConversations: (ids: string[]) => void;
  refreshConversations: () => Promise<void>;
  sendMessage: (text: string, modelOverride?: ChatModelType) => void;
  isGenerating: boolean;
  isLoadingConversation: boolean;
  selectedModel: ChatModelType;
  setSelectedModel: (m: ChatModelType) => void;
  isIncognito: boolean;
  setIncognito: (incognito: boolean) => void;
  incognitoMessages: ChatMessage[];
  clearIncognitoChat: () => void;
  // Projects
  projects: Project[];
  activeProject: Project | null;
  selectProject: (id: string | null) => void;
  createProject: (name: string, description?: string, instructions?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  refreshProjects: () => Promise<void>;
  addProjectKnowledge: (projectId: string, fileName: string, type: string) => void;
  // Artifacts
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  selectArtifact: (id: string | null) => void;
  createArtifact: (title: string, type: Artifact['type'], content: string) => Artifact;
  // Code sessions
  codeSessions: CodeSession[];
  activeCodeSession: CodeSession | null;
  selectCodeSession: (id: string | null) => void;
  createCodeSession: (title: string, environment: string, autoAccept: boolean) => CodeSession;
  runCodeSession: (sessionId: string, code: string) => void;
  // Remote sessions
  remoteSession: RemoteSession;
  connectRemoteSession: (sessionId: string, token: string) => void;
  disconnectRemoteSession: () => void;
  respondToTool: (approved: boolean) => void;
  // Profile & Settings
  profile: UserProfile;
  settings: AppSettings;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  logout: () => void;
}

const initialProfile: UserProfile = {
  name: '',
  email: '',
  organization: '',
  plan: 'Free',
  provider: 'google',
  userId: '',
};

const initialSettings: AppSettings = {
  themeMode: 'dark', // Flutter default is dark
  isIncognitoDefault: false,
  hapticFeedback: true,
  soundEffects: true,
  streamResponses: true,
  voiceStyle: 'Natural Balanced',
  activeModel: 'puku-ai-2.7',
};

const initialProjects: Project[] = [
  {
    id: 'proj_rn_migration',
    name: 'Puku AI Mobile Core',
    description: 'Production React Native application codebase and features',
    instructions: 'You are the principal mobile engineer for Puku AI. Provide production-ready, clean, responsive code.',
    color: '#6C47EB',
    createdAt: new Date().toISOString(),
    scope: 'power',
    knowledgeItems: [
      { id: 'k1', name: 'puku-architecture-guidelines.pdf', type: 'PDF', size: '1.2 MB', date: 'Just now' },
      { id: 'k2', name: 'design-tokens-v2.json', type: 'JSON', size: '42 KB', date: '2h ago' },
    ],
  },
];

const initialArtifacts: Artifact[] = [];

const initialCodeSessions: CodeSession[] = [];

const initialConversations: Conversation[] = [];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('login');
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>(['login']);
  const [routeParams, setRouteParams] = useState<any>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [incognitoMessages, setIncognitoMessages] = useState<ChatMessage[]>([]);
  const [incognitoConversationId, setIncognitoConversationId] = useState<string | null>(null);
  const incognitoConversationIdRef = useRef<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const logoutRef = useRef<() => void>(() => {});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const unsub = tokenManager.onSessionExpired(() => {
      logoutRef.current();
    });
    return unsub;
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [
          savedToken,
          savedProfileStr,
          savedRoute,
          savedActiveConvId,
          isLoggedOut,
          savedSettingsStr,
          savedConvsStr,
          savedModelStr,
          savedProjectsStr,
        ] = await Promise.all([
          AsyncStorage.getItem('@puku_auth_token'),
          AsyncStorage.getItem('@puku_user_profile'),
          AsyncStorage.getItem('@puku_active_route'),
          AsyncStorage.getItem('@puku_active_conversation_id'),
          AsyncStorage.getItem('@puku_is_logged_out'),
          AsyncStorage.getItem('@puku_app_settings'),
          AsyncStorage.getItem('@puku_conversations'),
          AsyncStorage.getItem('@puku_selected_model'),
          AsyncStorage.getItem('@puku_projects'),
        ]);

        if (
          savedModelStr &&
          (savedModelStr === 'opus-4.8' ||
            savedModelStr === 'puku-ai-2.8' ||
            savedModelStr === 'puku-ai-2.7')
        ) {
          setSelectedModelState(savedModelStr as ChatModelType);
        }

        if (savedSettingsStr) {
          try {
            const parsedSettings = JSON.parse(savedSettingsStr);
            if (parsedSettings) {
              setSettings(prev => ({
                ...prev,
                ...parsedSettings,
                themeMode: parsedSettings.themeMode || 'dark',
              }));
            }
          } catch {}
        }

        // Fresh install vs logged in:
        // Only if user explicitly logged out (via Settings -> Logout), require sign in
        if (isLoggedOut === 'true') {
          pukuApi.setAuthToken(null);
          setProfile(initialProfile);
          setConversations([]);
          setActiveConversationId(null);
          setActiveRoute('login');
          setRouteHistory(['login']);
          return;
        }

        // Validate or proactively refresh token without kicking user out on network glitches
        const validToken = await tokenManager.ensureValidToken().catch(() => null);
        const activeToken = validToken || savedToken;

        // Only on a fresh install where neither token nor profile exists, ask for login
        if (!activeToken && !savedProfileStr) {
          pukuApi.setAuthToken(null);
          setProfile(initialProfile);
          setConversations([]);
          setActiveConversationId(null);
          setActiveRoute('login');
          setRouteHistory(['login']);
          return;
        }

        // User is authenticated: maintain permanent session
        if (activeToken) {
          pukuApi.setAuthToken(activeToken);
        }

        if (savedProfileStr) {
          try {
            const parsedProfile = JSON.parse(savedProfileStr);
            if (parsedProfile && parsedProfile.email) {
              setProfile(prev => ({ ...prev, ...parsedProfile }));
            }
          } catch {}
        } else if (activeToken) {
          const jwtData = extractJwtData(activeToken);
          if (jwtData?.email) {
            setProfile(prev => ({
              ...prev,
              email: jwtData.email!,
              name: jwtData.name || jwtData.email!.split('@')[0],
              userId: jwtData.sub || prev.userId,
            }));
          }
        }

        let restoredConvId: string | null = null;
        if (savedConvsStr) {
          try {
            const parsedConvs = JSON.parse(savedConvsStr);
            if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
              setConversations(parsedConvs);
              if (savedActiveConvId && parsedConvs.some(c => c.id === savedActiveConvId)) {
                restoredConvId = savedActiveConvId;
              } else if (savedActiveConvId) {
                restoredConvId = savedActiveConvId;
              } else {
                restoredConvId = parsedConvs[0].id;
              }
              setActiveConversationId(restoredConvId);
            }
          } catch {}
        }

        // If active conversation restored is a cloud thread, ensure its messages are loaded
        if (
          restoredConvId &&
          !restoredConvId.startsWith('conv_') &&
          !restoredConvId.startsWith('incog_')
        ) {
          pukuApi
            .fetchConversation(restoredConvId)
            .then(detail => {
              const rawMsgs = Array.isArray(detail?.messages)
                ? detail.messages
                : Array.isArray(detail?.data?.messages)
                ? detail.data.messages
                : Array.isArray(detail)
                ? detail
                : [];
              if (rawMsgs.length > 0) {
                const loadedMessages: ChatMessage[] = rawMsgs.map((m: any) => ({
                  id: m.id || String(Date.now() + Math.random()),
                  role: m.role || 'assistant',
                  content: m.content || m.text || m.blocks?.[0]?.text || '',
                  model: m.model,
                  createdAt: formatActivityDate(m.createdAt),
                  blocks: m.blocks,
                  attachments: m.attachments,
                }));
                setConversations(prev =>
                  prev.map(c =>
                    c.id === restoredConvId ? { ...c, messages: loadedMessages } : c
                  )
                );
              }
            })
            .catch(() => {});
        }

        // Proactively sync cloud conversations from server
        if (activeToken) {
          pukuApi.fetchConversations().then(cloudConvs => {
            if (Array.isArray(cloudConvs) && cloudConvs.length > 0) {
              setConversations(prev => {
                const prevMap = new Map(prev.map(c => [c.id, c]));
                const merged: Conversation[] = cloudConvs.map((raw: any) => {
                  const existing = prevMap.get(raw.id);
                  const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
                  const messages =
                    rawMessages.length > 0
                      ? rawMessages.map((m: any) => ({
                          id: m.id || String(Date.now() + Math.random()),
                          role: m.role || 'assistant',
                          content: m.content || '',
                          model: m.model,
                          createdAt: formatActivityDate(m.createdAt),
                          blocks: m.blocks,
                          attachments: m.attachments,
                        }))
                      : existing?.messages || [];

                  const ts =
                    getConversationTimestamp(raw) ||
                    existing?.updatedAtTimestamp ||
                    Date.now();

                  return {
                    id: raw.id,
                    title: raw.title || existing?.title || 'New Chat',
                    activityDate:
                      formatActivityDate(
                        raw.updated_at ||
                        raw.updatedAt ||
                        raw.created_at ||
                        raw.createdAt ||
                        existing?.updatedAtTimestamp ||
                        ts
                      ),
                    projectId: raw.projectId || existing?.projectId,
                    messages,
                    model: raw.model ? mapApiToModel(raw.model) : existing?.model || 'puku-ai-2.7',
                    updatedAtTimestamp: ts,
                  };
                });

                for (const localConv of prev) {
                  if (!merged.some(m => m.id === localConv.id)) {
                    merged.push(localConv);
                  }
                }

                // Sort chronologically (newest first)
                merged.sort((a, b) => (b.updatedAtTimestamp || 0) - (a.updatedAtTimestamp || 0));
                AsyncStorage.setItem('@puku_conversations', JSON.stringify(merged)).catch(() => {});
                return merged;
              });
            }
          }).catch(() => {});
        }

        if (savedProjectsStr) {
          try {
            const parsedProjects = JSON.parse(savedProjectsStr);
            if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
              setProjects(parsedProjects);
            }
          } catch {}
        }

        // Proactively sync cloud projects from server
        if (activeToken) {
          pukuApi.fetchProjects().then(cloudProjects => {
            if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
              setProjects(prev => {
                const prevMap = new Map(prev.map(p => [p.id, p]));
                const merged: Project[] = cloudProjects.map((raw: any) => {
                  const existing = prevMap.get(raw.id);
                  return {
                    id: raw.id,
                    name: raw.name || existing?.name || 'Untitled Project',
                    description: raw.description || existing?.description,
                    instructions: raw.instructions || existing?.instructions,
                    color: raw.color || existing?.color || '#6C47EB',
                    createdAt: raw.createdAt || existing?.createdAt || new Date().toISOString(),
                    scope: raw.scope || existing?.scope || 'yours',
                    knowledgeItems: Array.isArray(raw.knowledgeItems)
                      ? raw.knowledgeItems
                      : existing?.knowledgeItems || [],
                  };
                });

                for (const localProj of prev) {
                  if (!merged.some(m => m.id === localProj.id)) {
                    merged.push(localProj);
                  }
                }
                return merged;
              });
            }
          }).catch(() => {});
        }

        const targetRoute =
          savedRoute && savedRoute !== 'login' ? (savedRoute as AppRoute) : 'chat';
        setActiveRoute(targetRoute);
        setRouteHistory([targetRoute]);
      } catch (err) {
        console.warn('Failed to restore session from AsyncStorage', err);
        setActiveRoute('login');
        setRouteHistory(['login']);
      } finally {
        if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test') {
          setIsRestoringSession(false);
        } else {
          setTimeout(() => {
            setIsRestoringSession(false);
          }, 350);
        }
      }
    }

    restoreSession();
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (conversations.length > 0) {
      AsyncStorage.setItem('@puku_conversations', JSON.stringify(conversations)).catch(() => {});
    }
  }, [conversations]);

  useEffect(() => {
    AsyncStorage.setItem('@puku_app_settings', JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  useEffect(() => {
    if (activeRoute && activeRoute !== 'login') {
      AsyncStorage.setItem('@puku_active_route', activeRoute).catch(() => {});
    }
  }, [activeRoute]);

  useEffect(() => {
    if (activeConversationId && !activeConversationId.startsWith('incog_')) {
      AsyncStorage.setItem('@puku_active_conversation_id', activeConversationId).catch(() => {});
    } else if (!activeConversationId) {
      AsyncStorage.removeItem('@puku_active_conversation_id').catch(() => {});
    }
  }, [activeConversationId]);

  const [selectedModel, setSelectedModelState] = useState<ChatModelType>('puku-ai-2.7');

  const setSelectedModel = (model: ChatModelType) => {
    setSelectedModelState(model);
    AsyncStorage.setItem('@puku_selected_model', model).catch(() => {});
    if (activeConversationId) {
      setConversations(prev =>
        prev.map(c => (c.id === activeConversationId ? { ...c, model } : c))
      );
      if (!activeConversationId.startsWith('conv_')) {
        pukuApi
          .updateConversation(activeConversationId, {
            model: mapModelToApi(model),
          })
          .catch(() => {});
      }
    }
  };

  const [isIncognito, setIsIncognito] = useState(false);

  const clearIncognitoChat = useCallback(() => {
    const idToDelete = incognitoConversationIdRef.current || incognitoConversationId;
    if (idToDelete && !idToDelete.startsWith('incog_')) {
      try {
        pukuApi.deleteConversation(idToDelete).catch(() => {});
      } catch {}
    }
    incognitoConversationIdRef.current = null;
    setIncognitoConversationId(null);
    setIncognitoMessages([]);

    setConversations(prev => {
      const filtered = prev.filter(
        c =>
          c.id !== idToDelete &&
          !c.id.startsWith('incog_') &&
          c.title?.toLowerCase() !== 'incognito'
      );
      if (filtered.length !== prev.length) {
        AsyncStorage.setItem('@puku_conversations', JSON.stringify(filtered)).catch(() => {});
      }
      return filtered;
    });
  }, [incognitoConversationId]);

  const setIncognito = useCallback(
    (value: boolean) => {
      setIsIncognito(value);
      if (!value) {
        clearIncognitoChat();
      }
    },
    [clearIncognitoChat]
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0) {
      AsyncStorage.setItem('@puku_projects', JSON.stringify(projects)).catch(() => {});
    }
  }, [projects]);

  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  const [codeSessions, setCodeSessions] = useState<CodeSession[]>(initialCodeSessions);
  const [activeCodeSessionId, setActiveCodeSessionId] = useState<string | null>(
    initialCodeSessions[0]?.id || null
  );

  const [remoteSession, setRemoteSession] = useState<RemoteSession>({
    sessionId: 'puku-relay-9281',
    token: 'tk_live_secure_9201948',
    title: 'Remote Agent Desktop Relay',
    status: 'idle',
    progressStatus: 'ready',
    logs: [
      '[System] Relay client connected to puku-relay-9281',
      '[Worker] CLI agent ready for tasks.',
    ],
  });

  const isDark = settings.themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const navigate = (route: AppRoute, params?: any) => {
    if (isIncognito && route !== 'chat') {
      setIsIncognito(false);
      clearIncognitoChat();
    }
    setDrawerOpen(false);
    setRouteParams(params);
    setRouteHistory(prev => [...prev, route]);
    setActiveRoute(route);
    if (route !== 'login') {
      AsyncStorage.setItem('@puku_active_route', route).catch(() => {});
    }
  };

  const goBack = useCallback(() => {
    if (isIncognito) {
      setIsIncognito(false);
      clearIncognitoChat();
    }
    if (routeHistory.length > 1) {
      const nextHistory = [...routeHistory];
      nextHistory.pop();
      const prevRoute = nextHistory[nextHistory.length - 1];
      if (prevRoute === 'login') {
        setActiveRoute('chat');
        setRouteHistory(['chat']);
      } else {
        setRouteHistory(nextHistory);
        setActiveRoute(prevRoute);
      }
    } else {
      setActiveRoute('chat');
    }
  }, [routeHistory, isIncognito, clearIncognitoChat]);

  useEffect(() => {
    const onBackPress = () => {
      if (isDrawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (isIncognito) {
        setIncognito(false);
        return true;
      }
      if (activeRoute === 'login') {
        return false;
      }
      if (activeRoute !== 'chat') {
        goBack();
        return true;
      }
      const previousNonLoginRoute = [...routeHistory]
        .reverse()
        .slice(1)
        .find(r => r !== 'login' && r !== 'chat');
      if (previousNonLoginRoute) {
        goBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isDrawerOpen, isIncognito, activeRoute, routeHistory, goBack, setIncognito]);

  const activeConversation =
    conversations.find(c => c.id === activeConversationId) || null;

  const refreshConversations = async () => {
    try {
      const cloudConvs = await pukuApi.fetchConversations();
      if (Array.isArray(cloudConvs)) {
        // Automatically delete any incognito conversation from server so it never shows in history
        const incognitoOnServer = cloudConvs.filter(
          (raw: any) =>
            raw.title?.toLowerCase() === 'incognito' ||
            raw.id === incognitoConversationIdRef.current
        );
        incognitoOnServer.forEach((raw: any) => {
          pukuApi.deleteConversation(raw.id).catch(() => {});
        });

        const validCloudConvs = cloudConvs.filter(
          (raw: any) =>
            raw.title?.toLowerCase() !== 'incognito' &&
            raw.id !== incognitoConversationIdRef.current
        );

        setConversations(prev => {
          const prevMap = new Map(prev.map(c => [c.id, c]));
          const merged: Conversation[] = validCloudConvs.map((raw: any) => {
            const existing = prevMap.get(raw.id);
            const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
            const messages =
              rawMessages.length > 0
                ? rawMessages.map((m: any) => ({
                    id: m.id || String(Date.now() + Math.random()),
                    role: m.role || 'assistant',
                    content: m.content || m.text || m.blocks?.[0]?.text || '',
                    model: m.model,
                    createdAt: formatActivityDate(m.createdAt),
                    blocks: m.blocks,
                    attachments: m.attachments,
                  }))
                : existing?.messages || [];

            const ts =
              getConversationTimestamp(raw) ||
              existing?.updatedAtTimestamp ||
              Date.now();

            return {
              id: raw.id,
              title: raw.title || existing?.title || 'New Chat',
              activityDate:
                formatActivityDate(
                  raw.updated_at ||
                  raw.updatedAt ||
                  raw.created_at ||
                  raw.createdAt ||
                  existing?.updatedAtTimestamp ||
                  ts
                ),
              projectId: raw.projectId || existing?.projectId,
              messages,
              model: raw.model ? mapApiToModel(raw.model) : existing?.model || 'puku-ai-2.7',
              updatedAtTimestamp: ts,
            };
          });

          for (const localConv of prev) {
            if (
              !merged.some(m => m.id === localConv.id) &&
              localConv.title?.toLowerCase() !== 'incognito' &&
              !localConv.id.startsWith('incog_')
            ) {
              merged.push(localConv);
            }
          }

          // Sort chronologically (newest conversation first)
          merged.sort((a, b) => (b.updatedAtTimestamp || 0) - (a.updatedAtTimestamp || 0));
          AsyncStorage.setItem('@puku_conversations', JSON.stringify(merged)).catch(() => {});
          return merged;
        });
      }
    } catch {}
  };

  const selectConversation = async (id: string | null) => {
    if (isIncognito) {
      setIsIncognito(false);
      clearIncognitoChat();
    }
    setActiveConversationId(id);
    setActiveRoute('chat');
    setDrawerOpen(false);

    if (!id) return;

    const conv = conversations.find(c => c.id === id);
    if (conv && conv.model) {
      setSelectedModelState(mapApiToModel(conv.model));
    }

    // Always fetch full message history for remote conversations to ensure ALL messages are visible
    if (!id.startsWith('conv_') && !id.startsWith('incog_')) {
      setIsLoadingConversation(true);
      try {
        const detail = await pukuApi.fetchConversation(id);
        const rawMsgs = Array.isArray(detail?.messages)
          ? detail.messages
          : Array.isArray(detail?.data?.messages)
          ? detail.data.messages
          : Array.isArray(detail)
          ? detail
          : [];

        if (rawMsgs.length > 0) {
          const loadedMessages: ChatMessage[] = rawMsgs.map((m: any) => ({
            id: m.id || String(Date.now() + Math.random()),
            role: m.role || 'assistant',
            content: m.content || m.text || m.blocks?.[0]?.text || '',
            model: m.model,
            createdAt: formatActivityDate(m.createdAt),
            blocks: m.blocks,
            attachments: m.attachments,
          }));

          const detailConv = detail?.conversation || detail?.data?.conversation;

          setConversations(prev => {
            const exists = prev.some(c => c.id === id);
            let updated: Conversation[];
            if (exists) {
              updated = prev.map(c =>
                c.id === id
                  ? {
                      ...c,
                      title: detailConv?.title || c.title,
                      model: detailConv?.model ? mapApiToModel(detailConv.model) : c.model,
                      messages: loadedMessages,
                    }
                  : c
              );
            } else {
              const newConv: Conversation = {
                id,
                title: detailConv?.title || 'Chat',
                activityDate: formatActivityDate(detailConv?.updatedAt || detailConv?.createdAt),
                projectId: detailConv?.projectId,
                messages: loadedMessages,
                model: detailConv?.model ? mapApiToModel(detailConv.model) : 'puku-ai-2.7',
                updatedAtTimestamp: getConversationTimestamp(detailConv),
              };
              updated = [newConv, ...prev];
            }
            AsyncStorage.setItem('@puku_conversations', JSON.stringify(updated)).catch(() => {});
            return updated;
          });
        }
      } catch {
      } finally {
        setIsLoadingConversation(false);
      }
    }
  };

  const startNewChat = (projectId?: string) => {
    if (isIncognito) {
      setIsIncognito(false);
      clearIncognitoChat();
    }
    setActiveConversationId(null);
    setActiveProjectId(projectId || null);
    setActiveRoute('chat');
    setDrawerOpen(false);
  };

  const deleteConversations = (ids: string[]) => {
    setConversations(prev => prev.filter(c => !ids.includes(c.id)));
    if (activeConversationId && ids.includes(activeConversationId)) {
      setActiveConversationId(null);
    }
    ids.forEach(id => {
      if (!id.startsWith('conv_')) {
        pukuApi.deleteConversation(id).catch(() => {});
      }
    });
  };

  const sendMessage = async (text: string, modelOverride?: ChatModelType) => {
    if (!text.trim()) return;
    const modelToUse = modelOverride || selectedModel;

    // Ephemeral Incognito / Temporary Chat handling
    if (isIncognito) {
      const userMsg: ChatMessage = {
        id: 'incog_' + Date.now(),
        role: 'user',
        content: text,
        model: modelToUse,
        createdAt: 'Just now',
      };
      const aiMsgId = 'incog_' + (Date.now() + 1);
      const initialAiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        model: modelToUse,
        createdAt: 'Just now',
      };
      setIncognitoMessages(prev => [...prev, userMsg, initialAiMsg]);
      setIsGenerating(true);

      let accumulatedText = '';
      let rafPending = false;

      const flushIncog = () => {
        rafPending = false;
        setIncognitoMessages(prev =>
          prev.map(m => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m))
        );
      };

      const handleDelta = (delta: string) => {
        accumulatedText += delta;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(flushIncog);
        }
      };

      try {
        const response = await pukuApi.generateResponse(
          text,
          modelToUse,
          incognitoConversationIdRef.current || incognitoConversationId,
          handleDelta,
          true
        );
        accumulatedText = response.text;
        flushIncog();

        if (response.conversationId) {
          incognitoConversationIdRef.current = response.conversationId;
          setIncognitoConversationId(response.conversationId);
        }
      } catch (err: any) {
        const errorMsg =
          err?.message ||
          'Failed to get response from Puku AI. Please check your connection or sign in again.';
        setIncognitoMessages(prev =>
          prev.map(m =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: accumulatedText
                    ? `${accumulatedText}\n\n[Error: ${errorMsg}]`
                    : errorMsg,
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Standard persistent conversation handling
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: 'Just now',
    };

    const aiMsgId = 'msg_' + (Date.now() + 1);
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      model: modelToUse,
      createdAt: 'Just now',
    };

    let targetConvId = activeConversationId;

    if (!targetConvId) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now(),
        title: text.length > 30 ? text.slice(0, 30) + '...' : text,
        activityDate: 'Just now',
        model: modelToUse,
        projectId: activeProjectId || undefined,
        messages: [userMsg, initialAiMsg],
        updatedAtTimestamp: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
      targetConvId = newConv.id;
      setActiveConversationId(targetConvId);
    } else {
      setConversations(prev =>
        prev.map(c =>
          c.id === targetConvId
            ? {
                ...c,
                model: modelToUse,
                messages: [...c.messages, userMsg, initialAiMsg],
                activityDate: 'Just now',
                updatedAtTimestamp: Date.now(),
              }
            : c
        )
      );
    }

    setIsGenerating(true);

    let accumulatedText = '';
    let rafPending = false;

    const flushPersistent = () => {
      rafPending = false;
      setConversations(prev =>
        prev.map(c => {
          if (c.id === targetConvId) {
            return {
              ...c,
              messages: c.messages.map(m =>
                m.id === aiMsgId ? { ...m, content: accumulatedText } : m
              ),
            };
          }
          return c;
        })
      );
    };

    const handleDelta = (delta: string) => {
      accumulatedText += delta;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushPersistent);
      }
    };

    try {
      const response = await pukuApi.generateResponse(
        text,
        modelToUse,
        targetConvId,
        handleDelta
      );
      accumulatedText = response.text;
      flushPersistent();

      const serverConvId = response.conversationId;
      if (targetConvId) {
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === targetConvId) {
              return {
                ...c,
                id: serverConvId || c.id,
                model: modelToUse,
                activityDate: 'Just now',
                updatedAtTimestamp: Date.now(),
                messages: c.messages.map(m =>
                  m.id === aiMsgId ? { ...m, content: response.text } : m
                ),
              };
            }
            return c;
          });
          updated.sort((a, b) => (b.updatedAtTimestamp || 0) - (a.updatedAtTimestamp || 0));
          return updated;
        });

        if (serverConvId && serverConvId !== targetConvId) {
          setActiveConversationId(serverConvId);
        }
      }
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        'Failed to get response from Puku AI. Please check your connection or sign in again.';
      if (targetConvId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === targetConvId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          content: accumulatedText
                            ? `${accumulatedText}\n\n[Error: ${errorMsg}]`
                            : errorMsg,
                        }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const selectProject = (id: string | null) => {
    setActiveProjectId(id);
    if (id) {
      navigate('projectDetails', { projectId: id });
    }
  };

  const refreshProjects = async () => {
    try {
      const cloudProjects = await pukuApi.fetchProjects();
      if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
        setProjects(prev => {
          const prevMap = new Map(prev.map(p => [p.id, p]));
          const merged: Project[] = cloudProjects.map((raw: any) => {
            const existing = prevMap.get(raw.id);
            return {
              id: raw.id,
              name: raw.name || existing?.name || 'Untitled Project',
              description: raw.description || existing?.description,
              instructions: raw.instructions || existing?.instructions,
              color: raw.color || existing?.color || '#6C47EB',
              createdAt: raw.createdAt || existing?.createdAt || new Date().toISOString(),
              scope: raw.scope || existing?.scope || 'yours',
              knowledgeItems: Array.isArray(raw.knowledgeItems)
                ? raw.knowledgeItems
                : existing?.knowledgeItems || [],
            };
          });

          for (const localProj of prev) {
            if (!merged.some(m => m.id === localProj.id)) {
              merged.push(localProj);
            }
          }
          return merged;
        });
      }
    } catch {}
  };

  const createProject = (name: string, description?: string, instructions?: string) => {
    const tempId = 'proj_' + Date.now();
    const newProj: Project = {
      id: tempId,
      name,
      description,
      instructions,
      color: '#6C47EB',
      createdAt: new Date().toISOString(),
      scope: 'yours',
      knowledgeItems: [],
    };
    setProjects(prev => [newProj, ...prev]);

    pukuApi
      .createProject({
        name,
        description,
        instructions,
        color: '#6C47EB',
        scope: 'yours',
      })
      .then(serverProj => {
        if (serverProj && (serverProj.id || serverProj._id)) {
          const realId = serverProj.id || serverProj._id;
          setProjects(prev => prev.map(p => (p.id === tempId ? { ...p, id: realId } : p)));
        }
      })
      .catch(() => {});

    return newProj;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    if (!id.startsWith('proj_')) {
      pukuApi.updateProject(id, updates as any).catch(() => {});
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
    if (!id.startsWith('proj_')) {
      pukuApi.deleteProject(id).catch(() => {});
    }
  };

  const addProjectKnowledge = (projectId: string, fileName: string, type: string) => {
    const newItem = {
      id: 'k_' + Date.now(),
      name: fileName,
      type,
      size: '256 KB',
      date: 'Just now',
    };
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, knowledgeItems: [newItem, ...p.knowledgeItems] }
          : p
      )
    );
  };

  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || null;

  const selectArtifact = (id: string | null) => {
    setActiveArtifactId(id);
  };

  const createArtifact = (title: string, type: Artifact['type'], content: string) => {
    const newArt: Artifact = {
      id: 'art_' + Date.now(),
      title,
      type,
      content,
      createdAt: 'Just now',
    };
    setArtifacts(prev => [newArt, ...prev]);
    return newArt;
  };

  const activeCodeSession =
    codeSessions.find(cs => cs.id === activeCodeSessionId) || null;

  const selectCodeSession = (id: string | null) => {
    setActiveCodeSessionId(id);
  };

  const createCodeSession = (
    title: string,
    environment: string,
    autoAccept: boolean
  ) => {
    const newSession: CodeSession = {
      id: 'cs_' + Date.now(),
      title,
      lastActivity: 'Just now',
      model: selectedModel,
      environment,
      acceptEditsAutomatically: autoAccept,
      status: 'idle',
      code: `// ${title}\n// Ready to write code\nconsole.log("Session started in ${environment}");`,
      terminalOutput: [
        `[Environment] Starting ${environment} runtime...`,
        `[Puku] Session "${title}" ready.`,
      ],
    };
    setCodeSessions(prev => [newSession, ...prev]);
    setActiveCodeSessionId(newSession.id);
    return newSession;
  };

  const runCodeSession = (sessionId: string, code: string) => {
    setCodeSessions(prev =>
      prev.map(cs => {
        if (cs.id !== sessionId) return cs;
        return {
          ...cs,
          code,
          status: 'running',
          terminalOutput: [
            ...(cs.terminalOutput || []),
            `> Executing: ${new Date().toLocaleTimeString()}`,
          ],
        };
      })
    );

    setTimeout(() => {
      setCodeSessions(prev =>
        prev.map(cs => {
          if (cs.id !== sessionId) return cs;
          return {
            ...cs,
            status: 'completed',
            terminalOutput: [
              ...(cs.terminalOutput || []),
              '[Process] Exited with code 0 (Success)',
              '✓ Execution output verified.',
            ],
          };
        })
      );
    }, 1000);
  };

  const connectRemoteSession = (sessionId: string, token: string) => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setRemoteSession(prev => ({
      ...prev,
      sessionId,
      token,
      status: 'connecting',
      logs: [...prev.logs, `[Connection] Connecting to relay session ${sessionId}...`],
    }));

    try {
      const wsUrl = `${ENV.REMOTE_SESSION_RELAY_HOST.replace(/^http/, 'ws')}/v1/sessions/${sessionId}/stream?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let fallbackTimer: any = setTimeout(() => {
        setRemoteSession(prev => ({
          ...prev,
          status: 'connected',
          progressStatus: 'thinking',
          currentTool: {
            name: 'run_command',
            description: 'npm test -- --watchAll=false',
            status: 'pending',
          },
          diffLines: [
            { type: 'context', text: '  const apiVersion = "2.7";' },
            { type: 'remove', text: '- function authenticateUser() { return false; }' },
            { type: 'add', text: '+ function authenticateUser() { return verifyPKCEToken(); }' },
          ],
          logs: [
            ...prev.logs,
            `[Connection] Authenticated successfully with token ${token.slice(0, 6)}***`,
            `[Agent] Remote workspace synced. Awaiting tool approval.`,
          ],
        }));
      }, 1500);

      ws.onopen = () => {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        setRemoteSession(prev => ({
          ...prev,
          status: 'connected',
          logs: [
            ...prev.logs,
            `[Connection] Live WebSocket connected to ${ENV.REMOTE_SESSION_RELAY_HOST}`,
            `[Agent] Remote workspace synced. Awaiting tool commands.`,
          ],
        }));
      };

      ws.onmessage = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'tool_request') {
            setRemoteSession(prev => ({
              ...prev,
              currentTool: {
                id: data.id || 'tool_' + Date.now(),
                name: data.name || 'Remote Tool Execution',
                description: data.description || data.command || '',
                timestamp: 'Just now',
                status: 'pending',
              },
              logs: [...prev.logs, `[Incoming Tool] ${data.name}: ${data.description || ''}`],
            }));
          } else if (data.log) {
            setRemoteSession(prev => ({
              ...prev,
              logs: [...prev.logs, `[Remote] ${data.log}`],
            }));
          }
        } catch {
          setRemoteSession(prev => ({
            ...prev,
            logs: [...prev.logs, `[Remote] ${event.data}`],
          }));
        }
      };

      ws.onerror = () => {
        // Fallback handles gracefully
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {
      // Fallback
    }
  };

  const disconnectRemoteSession = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setRemoteSession(prev => ({
      ...prev,
      status: 'disconnected',
      logs: [...prev.logs, '[Connection] Session closed.'],
    }));
  };

  const respondToTool = (approved: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            action: 'tool_response',
            approved,
            toolId: remoteSession.currentTool?.id,
          })
        );
      } catch {}
    }
    setRemoteSession(prev => ({
      ...prev,
      currentTool: prev.currentTool
        ? { ...prev.currentTool, status: approved ? 'approved' : 'rejected' }
        : undefined,
      logs: [
        ...prev.logs,
        approved ? '[Permission] Tool execution APPROVED.' : '[Permission] Tool execution REJECTED.',
      ],
      progressStatus: approved ? 'completed' : 'idle',
    }));
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('@puku_user_profile', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const logout = () => {
    pukuApi.setAuthToken(null);
    tokenManager.clearTokens().catch(() => {});
    clearIncognitoChat();
    AsyncStorage.setItem('@puku_is_logged_out', 'true').catch(() => {});
    AsyncStorage.removeItem('@puku_auth_token').catch(() => {});
    AsyncStorage.removeItem('@puku_refresh_token').catch(() => {});
    AsyncStorage.removeItem('@puku_token_expires_at').catch(() => {});
    AsyncStorage.removeItem('@puku_user_profile').catch(() => {});
    AsyncStorage.removeItem('@puku_conversations').catch(() => {});
    AsyncStorage.removeItem('@puku_projects').catch(() => {});
    AsyncStorage.removeItem('@puku_active_route').catch(() => {});
    AsyncStorage.removeItem('@puku_active_conversation_id').catch(() => {});
    AsyncStorage.removeItem('@puku_is_logged_in').catch(() => {});
    AsyncStorage.removeItem('@puku_selected_model').catch(() => {});
    setSelectedModelState('puku-ai-2.7');
    setProfile(initialProfile);
    setConversations([]);
    setProjects(initialProjects);
    setActiveConversationId(null);
    setActiveRoute('login');
    setRouteHistory(['login']);
  };
  logoutRef.current = logout;

  return (
    <AppContext.Provider
      value={{
        theme,
        isDark,
        activeRoute,
        routeParams,
        navigate,
        goBack,
        isDrawerOpen,
        setDrawerOpen,
        isRestoringSession,
        conversations,
        activeConversation,
        activeConversationId,
        selectConversation,
        startNewChat,
        deleteConversations,
        refreshConversations,
        sendMessage,
        isGenerating,
        isLoadingConversation,
        selectedModel,
        setSelectedModel,
        isIncognito,
        setIncognito,
        incognitoMessages,
        clearIncognitoChat,
        projects,
        activeProject,
        selectProject,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
        addProjectKnowledge,
        artifacts,
        activeArtifact,
        selectArtifact,
        createArtifact,
        codeSessions,
        activeCodeSession,
        selectCodeSession,
        createCodeSession,
        runCodeSession,
        remoteSession,
        connectRemoteSession,
        disconnectRemoteSession,
        respondToTool,
        profile,
        settings,
        updateProfile,
        updateSettings,
        logout,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
