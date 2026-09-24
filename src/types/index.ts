export type Role = 'user' | 'assistant' | 'system';

export type ChatModelType = 'puku-ai-2.7' | 'puku-ai-2.8' | 'opus-4.8';

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'code' | 'audio';
  uri?: string;
  size?: number;
}

export type ChatBlockType = 'text' | 'thinking' | 'toolUse' | 'image';

export interface ChatMessageBlock {
  type: ChatBlockType;
  id?: string;
  text?: string;
  title?: string;
  imageUrl?: string;
  result?: string;
  payload?: Record<string, any>;
  isExpanded?: boolean;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  model?: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  blocks?: ChatMessageBlock[];
  isThinkingExpanded?: boolean;
  liked?: boolean | null;
}

export interface Conversation {
  id: string;
  title: string;
  activityDate: string;
  projectId?: string;
  messages: ChatMessage[];
  model: ChatModelType;
}

export type ProjectScope = 'yours' | 'power' | 'shared' | 'archived';

export interface ProjectKnowledgeItem {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  color?: string;
  createdAt: string;
  scope: ProjectScope;
  knowledgeItems: ProjectKnowledgeItem[];
}

export interface Artifact {
  id: string;
  title: string;
  type: 'code' | 'markdown' | 'svg' | 'html';
  language?: string;
  content: string;
  createdAt: string;
  conversationId?: string;
}

export interface CodeSession {
  id: string;
  title: string;
  lastActivity: string;
  model: string;
  environment: string;
  acceptEditsAutomatically: boolean;
  code?: string;
  terminalOutput?: string[];
  status: 'idle' | 'running' | 'completed' | 'expired';
}

export interface RemoteSession {
  sessionId: string;
  token: string;
  title?: string;
  host?: string;
  status: 'connecting' | 'connected' | 'idle' | 'executing' | 'disconnected';
  currentTool?: {
    name: string;
    description: string;
    params?: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
  };
  progressStatus: 'thinking' | 'idle' | 'ready' | 'completed' | 'failed';
  diffLines?: Array<{ type: 'add' | 'remove' | 'context'; text: string }>;
  logs: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  organization: string;
  plan: 'Power' | 'Pro' | 'Free';
  provider: string;
  userId: string;
}

export interface AppSettings {
  themeMode: 'dark' | 'light' | 'system';
  isIncognitoDefault: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  streamResponses: boolean;
  voiceStyle: string;
  activeModel: ChatModelType;
}

export type AppRoute =
  | 'chat'
  | 'chats'
  | 'projects'
  | 'projectDetails'
  | 'artifacts'
  | 'code'
  | 'remoteSession'
  | 'transcribe'
  | 'liveVoice'
  | 'settings'
  | 'profile'
  | 'login';
