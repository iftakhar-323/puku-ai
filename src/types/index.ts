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
  updatedAtTimestamp?: number;
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

export interface ActiveRelaySession {
  sessionId: string;
  createdAt: number;
  workerConnected: boolean;
  clientConnected: boolean;
  clientCount: number;
  live: boolean;
  resumableUntil?: number;
  expired?: boolean;
  mobileToken?: string;
  title: string;
  titleUpdatedAt?: number;
  ownerEmail?: string;
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
  | 'pukuBot'
  | 'remoteSession'
  | 'transcribe'
  | 'liveVoice'
  | 'settings'
  | 'profile'
  | 'usage'
  | 'login';

// ══════════════════════════════════════════════════════════════════════════
// PUKU BOT API (v1) DATA MODELS
// ══════════════════════════════════════════════════════════════════════════

export interface PukuBotUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role?: 'user' | 'admin';
  onboarding?: { step: number; completedAt: string | null } | null;
}

/** A `/` skill. A Bot's skills carry slug, title and summary; the person's own list carries the rest. */
export interface PukuBotSkill {
  slug: string;
  title: string;
  summary?: string;
  instructions?: string;
  tools?: string[];
  /** The person's own, so theirs to edit and delete. */
  mine?: boolean;
  /** The deployment's, read-only from the app. */
  deployment?: boolean;
}

export interface PukuBotItem {
  id: string;
  name: string;
  title: string;
  description: string;
  avatarSeed: string;
  default?: boolean;
  skills?: PukuBotSkill[];
}

export interface PukuBotConversation {
  id: string;
  botId: string | null;
  botIds?: string[];
  /** What to call the Bot in this conversation (named after its task). */
  botName?: string;
  /** Who chose the Bot when the conversation was created. */
  routedBy?: 'person' | 'router' | 'default';
  title: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  pinned: boolean;
  createdAt: string | null;
  lastReadAt: string | null;
  unread: boolean;
}

export type PukuBotMemoryKind = 'fact' | 'preference' | 'entity' | 'task';

/** One thing a Bot remembers. Memory is per Bot. */
export interface PukuBotMemory {
  id: string;
  botId?: string | null;
  kind?: PukuBotMemoryKind;
  content: string;
  useCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PukuBotRoutine {
  id: string;
  botId?: string | null;
  instruction: string;
  /** Prose such as "Weekdays at 09:00" where it can be, else a cron expression. Show, never parse. */
  schedule: string;
  timezone?: string;
  enabled: boolean;
  nextRunAt?: string | null;
}

export type PukuBotTemplateCategory =
  | 'engineering'
  | 'sales'
  | 'marketing'
  | 'design'
  | 'personal'
  | 'recruiting'
  | 'product'
  | 'operations';

/** A coworker as the web's Agents page lists it (GET /api/agents). */
export interface PukuBotAgent {
  id: string;
  name: string;
  title: string;
  roleDescription: string;
  avatarSeed: string;
  visibility: 'public' | 'private';
  builtIn?: boolean;
  hidden?: boolean;
  systemOwned?: boolean;
  canManage?: boolean;
  mine?: boolean;
  isTemplate?: boolean;
  templateCategory?: PukuBotTemplateCategory | null;
}

/** One Marketplace card (GET /api/agents/marketplace). */
export interface PukuBotTemplate {
  agentId: string;
  name: string;
  title: string;
  roleDescription: string;
  avatarSeed: string;
  category: PukuBotTemplateCategory;
  blurb: string;
  authorName: string | null;
  createdAt: string;
}

/** The deployment facts the app reads from GET /api/capabilities. */
export interface PukuBotCapabilities {
  agentCloudUrl: string | null;
  defaultBotId?: string;
}

/** A service a Bot reads as this person (GET /connections). */
export interface PukuBotConnection {
  id: string;
  /** `oauth`: the person signs in themselves. `brokered`: through a broker, then confirmed. */
  kind?: 'oauth' | 'brokered';
  name: string;
  vendor?: string;
  summary?: string;
  connected: boolean;
  connectedAt?: string | null;
}

export interface PukuBotInstructions {
  instructions: string;
  updatedAt?: string;
}

export interface PukuBotCreateConversationParams {
  botId?: string;
  botIds?: string[];
  text?: string;
}

export interface PukuBotSendMessageOptions {
  attachments?: PukuBotAttachment[];
  botId?: string;
  skills?: string[];
}

export interface PukuBotAttachment {
  id: string;
  name?: string | null;
  kind?: 'image' | 'document';
  mimeType?: string;
  url?: string;
}

export interface PukuBotToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'completed' | 'pending';
  result?: any;
}

export interface PukuBotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  botId?: string;
  botName?: string;
  kind?: 'background_task';
  attachments?: PukuBotAttachment[];
  toolCalls?: PukuBotToolCall[];
}

export interface PukuBotControlState {
  holder: 'bot' | 'human';
  since: string;
  requested: boolean;
  reason?: string;
  secretWanted?: string;
  desktop?: boolean;
}

export interface PukuBotComputerInfo {
  status: {
    botId: string;
    state: 'absent' | 'starting' | 'ready' | 'unreachable';
    reason?: string;
  };
  control: PukuBotControlState | null;
  desktopSocket?: string;
  pageSocket?: string;
}

export type PukuBotTurnEventType =
  | 'turn.started'
  | 'message.started'
  | 'message.delta'
  | 'message.completed'
  | 'tool.started'
  | 'tool.completed'
  | 'needs_person'
  | 'turn.completed'
  | 'turn.failed'
  | 'ping';

export interface PukuBotTurnEvent {
  type: PukuBotTurnEventType;
  /** SSE `id:` of the event, used as Last-Event-ID when resuming. */
  eventId?: string;
  turnId?: string;
  conversationId?: string;
  messageId?: string;
  delta?: string;
  text?: string;
  toolCallId?: string;
  name?: string;
  arguments?: Record<string, any>;
  ok?: boolean;
  result?: any;
  kind?: 'help' | 'secret';
  botId?: string;
  reason?: string;
  label?: string;
  code?: 'busy' | 'stopped' | 'too_many_steps' | 'timeout' | 'error';
  message?: string;
}

export interface BotConversation {
  id: string;
  botId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp?: string;
    toolCalls?: PukuBotToolCall[];
  }>;
}

export interface BotItem {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
}
