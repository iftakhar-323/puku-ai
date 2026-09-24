import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { pukuApi } from '../services/api';

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
  name: 'Puku Developer',
  email: 'puku@puku.net',
  organization: 'puku',
  plan: 'Power',
  provider: 'google',
  userId: 'usr_puku_8492048',
};

const initialSettings: AppSettings = {
  themeMode: 'light',
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
  {
    id: 'proj_flutter_parity',
    name: 'Flutter Feature Parity',
    description: 'Migration and parity tracking across all screens and UI widgets',
    instructions: 'Ensure full 1:1 functional compatibility with Flutter implementation for both Android and iOS.',
    color: '#0288D1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    scope: 'yours',
    knowledgeItems: [],
  },
];

const initialArtifacts: Artifact[] = [
  {
    id: 'art_1',
    title: 'PukuColorPalette.ts',
    type: 'code',
    language: 'typescript',
    createdAt: 'Just now',
    content: `export const PukuColors = {
  primary: '#6C47EB',
  accent: '#A5A5FF',
  backgroundLight: '#F8F7FF',
  backgroundDark: '#100D1D',
  tagText: '#4A2EC7',
  pillBackground: '#E4DCF5'
};`,
  },
  {
    id: 'art_2',
    title: 'MigrationArchitecture.md',
    type: 'markdown',
    language: 'markdown',
    createdAt: '1h ago',
    content: `# Puku AI Architecture
- Direct 1:1 Screen mapping from Flutter
- Unified AppContext with reactive updates
- Modular screen components
- Offline persistence`,
  },
  {
    id: 'art_3',
    title: 'LiveVoicePulseOrb.svg',
    type: 'svg',
    language: 'xml',
    createdAt: 'Yesterday',
    content: `<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#6C47EB" opacity="0.3"/>
  <circle cx="50" cy="50" r="30" fill="#A5A5FF" opacity="0.7"/>
  <circle cx="50" cy="50" r="15" fill="#FFFFFF"/>
</svg>`,
  },
];

const initialCodeSessions: CodeSession[] = [
  {
    id: 'cs_101',
    title: 'React Native Hermes Optimizer',
    lastActivity: 'Just now',
    model: 'puku-ai-2.7',
    environment: 'React Native / TypeScript',
    acceptEditsAutomatically: true,
    status: 'idle',
    code: `// Test Hermes runtime performance\nfunction benchmark() {\n  const start = performance.now();\n  let sum = 0;\n  for(let i=0; i<100000; i++) sum += i;\n  console.log("Completed in " + (performance.now() - start).toFixed(2) + "ms. Sum: " + sum);\n}\nbenchmark();`,
    terminalOutput: ['[System] Hermes runtime initialized.', '[Worker] Session ready on channel #cs_101', 'Completed in 1.42ms. Sum: 4999950000'],
  },
];

const initialConversations: Conversation[] = [
  {
    id: 'conv_1',
    title: 'Look over my code and give me tips',
    activityDate: 'Just now',
    model: 'puku-ai-2.7',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Look over my code and give me tips on optimizing Android APK builds.',
        createdAt: '10:30 AM',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: "Here are high-impact tips for optimizing your React Native Android APK:\n\n1. **Enable ProGuard & R8 shrinker** in `android/app/build.gradle`.\n2. **Use Hermes Engine** for instant startup and low memory footprint.\n3. **Use ABI Splitting** so your users only download binaries for their device architecture (`arm64-v8a`).",
        createdAt: '10:31 AM',
        model: 'puku-ai-2.7',
        blocks: [
          {
            type: 'thinking',
            text: 'Analyzing Android Gradle setup, Hermes bytecode compilation flags, and native asset bundling...',
            isExpanded: false,
          },
          {
            type: 'text',
            text: "Here are high-impact tips for optimizing your React Native Android APK:\n\n1. **Enable ProGuard & R8 shrinker** in `android/app/build.gradle`.\n2. **Use Hermes Engine** for instant startup and low memory footprint.\n3. **Use ABI Splitting** so your users only download binaries for their device architecture (`arm64-v8a`).",
          },
        ],
      },
    ],
  },
  {
    id: 'conv_2',
    title: 'Explain PKCE OAuth flow for mobile',
    activityDate: '2h ago',
    model: 'puku-ai-2.7',
    messages: [
      {
        id: 'm20',
        role: 'user',
        content: 'Explain PKCE OAuth flow for mobile apps.',
        createdAt: '8:15 AM',
      },
      {
        id: 'm21',
        role: 'assistant',
        content: 'Proof Key for Code Exchange (PKCE) prevents authorization code interception attacks on public clients like mobile apps by generating a code verifier and code challenge pair.',
        createdAt: '8:16 AM',
        model: 'puku-ai-2.7',
      },
    ],
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('chat');
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>(['chat']);
  const [routeParams, setRouteParams] = useState<any>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ChatModelType>('puku-ai-2.7');
  const [isIncognito, setIncognito] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  const [codeSessions, setCodeSessions] = useState<CodeSession[]>(initialCodeSessions);
  const [activeCodeSessionId, setActiveCodeSessionId] = useState<string | null>(initialCodeSessions[0].id);

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
      if (conv) setSelectedModel(conv.model);
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
            ? { ...c, messages: [...c.messages, userMsg], activityDate: 'Just now' }
            : c
        )
      );
    }

    setIsGenerating(true);

    try {
      const response = await pukuApi.generateResponse(text, modelToUse, targetConvId);
      const aiMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: response.text,
        model: modelToUse,
        createdAt: 'Just now',
        blocks: [
          {
            type: 'thinking',
            text: response.thinking,
            isExpanded: false,
          },
          {
            type: 'text',
            text: response.text,
          },
        ],
      };

      if (!isIncognito && targetConvId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === targetConvId ? { ...c, messages: [...c.messages, aiMsg] } : c
          )
        );
      }
    } catch {
      // Fallback assistant response
      const fallbackMsg: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: `Response from ${modelToUse} for: "${text}"`,
        model: modelToUse,
        createdAt: 'Just now',
      };
      if (!isIncognito && targetConvId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === targetConvId ? { ...c, messages: [...c.messages, fallbackMsg] } : c
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
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const logout = () => {
    navigate('login');
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
