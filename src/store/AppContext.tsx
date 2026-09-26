import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { extractJwtData } from '../utils/auth';

interface AppContextValue {
  theme: ThemeColors;
  isDark: boolean;
  activeRoute: AppRoute;
  routeParams: any;
  navigate: (route: AppRoute, params?: any) => void;
  goBack: () => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  // Chat
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  selectConversation: (id: string | null) => void;
  startNewChat: (projectId?: string) => void;
  deleteConversations: (ids: string[]) => void;
  sendMessage: (text: string, modelOverride?: ChatModelType) => void;
  isGenerating: boolean;
  selectedModel: ChatModelType;
  setSelectedModel: (m: ChatModelType) => void;
  isIncognito: boolean;
  setIncognito: (incognito: boolean) => void;
  // Projects
  projects: Project[];
  activeProject: Project | null;
  selectProject: (id: string | null) => void;
  createProject: (name: string, description?: string, instructions?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
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

  useEffect(() => {
    async function restoreSession() {
      try {
        const [
          savedToken,
          savedProfileStr,
          savedRoute,
          isLoggedOut,
          savedSettingsStr,
          savedConvsStr,
          savedModelStr,
        ] = await Promise.all([
          AsyncStorage.getItem('@puku_auth_token'),
          AsyncStorage.getItem('@puku_user_profile'),
          AsyncStorage.getItem('@puku_active_route'),
          AsyncStorage.getItem('@puku_is_logged_out'),
          AsyncStorage.getItem('@puku_app_settings'),
          AsyncStorage.getItem('@puku_conversations'),
          AsyncStorage.getItem('@puku_selected_model'),
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

        // Standard: Fresh install or logged out requires user to sign in
        if (isLoggedOut === 'true' || !savedToken) {
          pukuApi.setAuthToken(null);
          setProfile(initialProfile);
          setConversations([]);
          setActiveConversationId(null);
          setActiveRoute('login');
          setRouteHistory(['login']);
          return;
        }

        // User is authenticated: restore session
        pukuApi.setAuthToken(savedToken);

        if (savedProfileStr) {
          try {
            const parsedProfile = JSON.parse(savedProfileStr);
            if (parsedProfile && parsedProfile.email) {
              setProfile(prev => ({ ...prev, ...parsedProfile }));
            }
          } catch {}
        } else {
          const jwtData = extractJwtData(savedToken);
          if (jwtData?.email) {
            setProfile(prev => ({
              ...prev,
              email: jwtData.email!,
              name: jwtData.name || jwtData.email!.split('@')[0],
              userId: jwtData.sub || prev.userId,
            }));
          }
        }

        if (savedConvsStr) {
          try {
            const parsedConvs = JSON.parse(savedConvsStr);
            if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
              setConversations(parsedConvs);
              setActiveConversationId(parsedConvs[0].id);
            }
          } catch {}
        }

        const targetRoute =
          savedRoute && savedRoute !== 'login' ? (savedRoute as AppRoute) : 'chat';
        setActiveRoute(targetRoute);
        setRouteHistory([targetRoute]);
      } catch (err) {
        console.warn('Failed to restore session from AsyncStorage', err);
        setActiveRoute('login');
        setRouteHistory(['login']);
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
  const [isIncognito, setIncognito] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

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
    setDrawerOpen(false);
    setRouteParams(params);
    setRouteHistory(prev => [...prev, route]);
    setActiveRoute(route);
    if (route !== 'login') {
      AsyncStorage.setItem('@puku_active_route', route).catch(() => {});
    }
  };

  const goBack = () => {
    if (routeHistory.length > 1) {
      const nextHistory = [...routeHistory];
      nextHistory.pop();
      const prevRoute = nextHistory[nextHistory.length - 1];
      setRouteHistory(nextHistory);
      setActiveRoute(prevRoute);
    } else {
      setActiveRoute('chat');
    }
  };

  const activeConversation =
    conversations.find(c => c.id === activeConversationId) || null;

  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      const conv = conversations.find(c => c.id === id);
      if (conv && conv.model) {
        setSelectedModelState(mapApiToModel(conv.model));
      }
    }
    setActiveRoute('chat');
  };

  const startNewChat = (projectId?: string) => {
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
  };

  const sendMessage = async (text: string, modelOverride?: ChatModelType) => {
    if (!text.trim()) return;
    const modelToUse = modelOverride || selectedModel;
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: 'Just now',
    };

    let targetConvId = activeConversationId;

    if (!targetConvId && !isIncognito) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now(),
        title: text.length > 30 ? text.slice(0, 30) + '...' : text,
        activityDate: 'Just now',
        model: modelToUse,
        projectId: activeProjectId || undefined,
        messages: [userMsg],
      };
      setConversations(prev => [newConv, ...prev]);
      targetConvId = newConv.id;
      setActiveConversationId(targetConvId);
    } else if (targetConvId && !isIncognito) {
      setConversations(prev =>
        prev.map(c =>
          c.id === targetConvId
            ? {
                ...c,
                model: modelToUse,
                messages: [...c.messages, userMsg],
                activityDate: 'Just now',
              }
            : c
        )
      );
    }

    setIsGenerating(true);

    try {
      const response = await pukuApi.generateResponse(text, modelToUse, targetConvId);
      const serverConvId = response.conversationId;
      const aiMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: response.text,
        model: modelToUse,
        createdAt: 'Just now',
      };

      if (!isIncognito && targetConvId) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === targetConvId) {
              return {
                ...c,
                id: serverConvId || c.id,
                model: modelToUse,
                messages: [...c.messages, aiMsg],
              };
            }
            return c;
          })
        );
        if (serverConvId && serverConvId !== targetConvId) {
          setActiveConversationId(serverConvId);
        }
      }
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        'Failed to get response from Puku AI. Please check your connection or sign in again.';
      const fallbackMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: errorMsg,
        model: modelToUse,
        createdAt: 'Just now',
      };
      if (!isIncognito && targetConvId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === targetConvId
              ? {
                  ...c,
                  model: modelToUse,
                  messages: [...c.messages, fallbackMsg],
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

  const createProject = (name: string, description?: string, instructions?: string) => {
    const newProj: Project = {
      id: 'proj_' + Date.now(),
      name,
      description,
      instructions,
      color: '#6C47EB',
      createdAt: new Date().toISOString(),
      scope: 'yours',
      knowledgeItems: [],
    };
    setProjects(prev => [newProj, ...prev]);
    return newProj;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
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
    setRemoteSession(prev => ({
      ...prev,
      sessionId,
      token,
      status: 'connecting',
      logs: [...prev.logs, `[Connection] Connecting to relay session ${sessionId}...`],
    }));

    setTimeout(() => {
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
    }, 1200);
  };

  const disconnectRemoteSession = () => {
    setRemoteSession(prev => ({
      ...prev,
      status: 'disconnected',
      logs: [...prev.logs, '[Connection] Session closed.'],
    }));
  };

  const respondToTool = (approved: boolean) => {
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
    AsyncStorage.setItem('@puku_is_logged_out', 'true').catch(() => {});
    AsyncStorage.removeItem('@puku_auth_token').catch(() => {});
    AsyncStorage.removeItem('@puku_user_profile').catch(() => {});
    AsyncStorage.removeItem('@puku_conversations').catch(() => {});
    AsyncStorage.removeItem('@puku_active_route').catch(() => {});
    AsyncStorage.removeItem('@puku_is_logged_in').catch(() => {});
    AsyncStorage.removeItem('@puku_selected_model').catch(() => {});
    setSelectedModelState('puku-ai-2.7');
    setProfile(initialProfile);
    setConversations([]);
    setActiveConversationId(null);
    setActiveRoute('login');
    setRouteHistory(['login']);
  };

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
        conversations,
        activeConversation,
        activeConversationId,
        selectConversation,
        startNewChat,
        deleteConversations,
        sendMessage,
        isGenerating,
        selectedModel,
        setSelectedModel,
        isIncognito,
        setIncognito,
        projects,
        activeProject,
        selectProject,
        createProject,
        updateProject,
        deleteProject,
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
