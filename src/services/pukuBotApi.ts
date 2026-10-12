/**
 * Puku Bot API (v1) Client
 *
 * Implements the official Puku Bot Mobile API specification:
 * - PKCE OAuth2 authentication with system browser / Custom Tabs
 * - Bot discovery (/bots)
 * - Conversation management (/conversations)
 * - Real-time SSE streaming for messages, tool execution, and turns
 * - Computer control and Human-In-The-Loop (needs_person: help / secret)
 * - Local / Standby fallback support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { Linking } from 'react-native';
import { ENV } from '../config/env';
import {
  PukuBotAttachment,
  PukuBotComputerInfo,
  PukuBotConnection,
  PukuBotControlState,
  PukuBotConversation,
  PukuBotCreateConversationParams,
  PukuBotInstructions,
  PukuBotItem,
  PukuBotMemory,
  PukuBotMessage,
  PukuBotRoutine,
  PukuBotSkill,
  PukuBotTurnEvent,
  PukuBotUser,
} from '../types';
import { generatePkcePair, generateRandomString } from '../utils/auth';
import { NativePicker } from './nativeModules';
import { secureStorage } from './secureStorage';
import { ignore } from '../utils/devLog';
import { pukuBotOutbox, OUTBOX_USER_KEY } from './pukuBotOutbox';

const STORAGE_KEYS = {
  BASE_URL: '@pukubot_base_url',
  TOKEN: '@pukubot_token',
  USER: '@pukubot_user',
  ACTIVE_BOT: '@pukubot_active_bot',
  ACTIVE_CONVERSATION: '@pukubot_active_conv',
  AUTH_VERIFIER: '@pukubot_auth_verifier',
  AUTH_STATE: '@pukubot_auth_state',
  MEMORIES: '@pukubot_memories',
  ROUTINES: '@pukubot_routines',
  SKILLS: '@pukubot_skills',
  CONNECTIONS: '@pukubot_connections',
  INSTRUCTIONS: '@pukubot_instructions',
};

const MAX_RESUME_ATTEMPTS = 3;
const RESUME_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 120;
const INBOX_BASE_BACKOFF_MS = 1000;
const INBOX_MAX_BACKOFF_MS = 30000;

/** One server-sent event. */
export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

interface SseHandlers {
  onMessage: (msg: SseMessage) => void;
  onEnd: (status: number, responseText: string, sawEvents: boolean) => void;
  onNetworkError: () => void;
}

/**
 * Incremental `text/event-stream` parser. Chunks may split events (or even
 * a CRLF) anywhere; only complete events are emitted.
 */
export function createSseParser(onMessage: (msg: SseMessage) => void) {
  let buffer = '';

  const parseBlock = (block: string) => {
    let id: string | undefined;
    let event: string | undefined;
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      const idx = line.indexOf(':');
      const field = idx === -1 ? line : line.slice(0, idx);
      let value = idx === -1 ? '' : line.slice(idx + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'id') id = value;
      else if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length > 0 || id !== undefined) {
      onMessage({ id, event, data: data.join('\n') });
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      blocks.forEach(parseBlock);
    },
    flush() {
      if (buffer.trim()) parseBlock(buffer);
      buffer = '';
    },
  };
}

/** PUT /settings/instructions accepts at most this many characters. */
export const MAX_INSTRUCTIONS_LENGTH = 4000;

export class PukuBotApiClient {
  private static instance: PukuBotApiClient;

  private baseUrl: string = ENV.PUKU_BOT_API_BASE_URL || 'https://app.bot.puku.sh/api/v1';
  private token: string | null = null;
  private user: PukuBotUser | null = null;
  private isInitialized = false;

  private authChangeListeners: Array<(user: PukuBotUser | null) => void> = [];

  private constructor() {}

  public static getInstance(): PukuBotApiClient {
    if (!PukuBotApiClient.instance) {
      PukuBotApiClient.instance = new PukuBotApiClient();
    }
    return PukuBotApiClient.instance;
  }

  /**
   * Initializes the client from persistent storage.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const [savedUrl, savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BASE_URL),
        secureStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      // Custom/self-hosted base URLs are a dev convenience only: letting a
      // production user point the PKCE token exchange at an arbitrary host
      // is a phishing vector (see security audit). Ignore any saved
      // override outside __DEV__.
      if (savedUrl && __DEV__) {
        this.baseUrl = savedUrl.replace(/\/+$/, '');
      }
      if (savedToken) {
        this.token = savedToken;
      }
      if (savedUser) {
        try {
          this.user = JSON.parse(savedUser);
        } catch {
          this.user = null;
        }
      }
    } catch (e) {
      console.warn('[PukuBotApi] Init error:', e);
    } finally {
      this.isInitialized = true;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION & AUTH STATE
  // ══════════════════════════════════════════════════════════════════════════

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async setBaseUrl(url: string): Promise<void> {
    if (!__DEV__) return;
    const cleaned = url.trim().replace(/\/+$/, '');
    this.baseUrl = cleaned;
    await AsyncStorage.setItem(STORAGE_KEYS.BASE_URL, cleaned);
  }

  public getToken(): string | null {
    return this.token;
  }

  public getUser(): PukuBotUser | null {
    return this.user;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public async setToken(token: string | null, user?: PukuBotUser | null): Promise<void> {
    this.token = token;
    this.user = user || null;
    if (token) {
      await secureStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      await secureStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
    if (this.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
      if (this.user.id) {
        const prevUserId = await AsyncStorage.getItem(OUTBOX_USER_KEY).catch(() => null);
        if (prevUserId && prevUserId !== this.user.id) {
          await pukuBotOutbox.clear();
        }
        await AsyncStorage.setItem(OUTBOX_USER_KEY, this.user.id);
      }
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
    this.notifyAuthChange();
    if (this.isAuthenticated()) {
      this.replayOutbox().catch(ignore('pukuBotApi'));
    }
  }

  public onAuthChange(listener: (user: PukuBotUser | null) => void): () => void {
    this.authChangeListeners.push(listener);
    return () => {
      this.authChangeListeners = this.authChangeListeners.filter(l => l !== listener);
    };
  }

  private notifyAuthChange() {
    this.authChangeListeners.forEach(listener => {
      try {
        listener(this.user);
      } catch (err) {
        console.error('[PukuBotApi] Auth listener error:', err);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION (PKCE FLOW)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Starts PKCE sign-in flow by opening system browser / Custom Tabs.
   */
  public async startAuth(customRedirect?: string): Promise<{ success: boolean; url?: string }> {
    await this.init();

    const redirectUri = customRedirect || ENV.PUKU_BOT_REDIRECT_URI || 'pukubot://auth/callback';
    const { verifier, challenge } = generatePkcePair();
    const state = generateRandomString(32);

    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_VERIFIER, verifier);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);

    const authUrl =
      `${this.baseUrl}/auth/start?provider=puku` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    try {
      const isAvailable = await InAppBrowser.isAvailable();
      if (isAvailable) {
        const authResponse = await InAppBrowser.openAuth(authUrl, redirectUri, {
          ephemeralWebSession: false,
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: true,
        });

        if (authResponse.type === 'success' && authResponse.url) {
          await this.handleAuthCallback(authResponse.url);
          return { success: true, url: authResponse.url };
        }
      } else {
        await Linking.openURL(authUrl);
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[PukuBotApi] InAppBrowser error, falling back to openURL:', err);
      await Linking.openURL(authUrl);
      return { success: true };
    }
  }

  /**
   * Handles the redirect URL (pukubot://auth/callback?code=...&state=...)
   */
  public async handleAuthCallback(url: string): Promise<{ token: string; user: PukuBotUser | null }> {
    const code = new URL(url).searchParams.get('code');
    // The same redirect reaches us twice (InAppBrowser.openAuth's result and
    // the pukubot:// deep link); a code can only be exchanged once.
    if (code && this.pendingCallback?.code === code) {
      return this.pendingCallback.promise;
    }
    const promise = this.exchangeAuthCode(url);
    this.pendingCallback = { code: code || '', promise };
    return promise;
  }

  private pendingCallback: {
    code: string;
    promise: Promise<{ token: string; user: PukuBotUser | null }>;
  } | null = null;

  private async exchangeAuthCode(url: string): Promise<{ token: string; user: PukuBotUser | null }> {
    await this.init();

    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');

    if (!code || !state) {
      throw new Error('Sign-in redirect is missing code or state.');
    }

    const storedState = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    const storedVerifier = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_VERIFIER);

    if (!storedVerifier) {
      throw new Error('PKCE code verifier not found. Please try signing in again.');
    }

    if (storedState && storedState !== state) {
      throw new Error('OAuth state mismatch. Security check failed.');
    }

    // Step 2: Trade the code and verifier for a session token
    const tokenEndpoint = `${this.baseUrl}/auth/token`;
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        codeVerifier: storedVerifier,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.token) {
      throw new Error(data?.error || data?.message || 'Failed to exchange sign-in code.');
    }

    this.token = data.token;
    this.user = data.user || null;

    await secureStorage.setItem(STORAGE_KEYS.TOKEN, this.token as string);
    if (this.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }

    // Clean up temporary PKCE values
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_VERIFIER);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_STATE);

    this.notifyAuthChange();

    return { token: this.token as string, user: this.user };
  }

  /**
   * Signs out the current user and clears session data.
   */
  public async signOut(): Promise<void> {
    if (this.token) {
      try {
        await fetch(`${this.baseUrl}/auth/sign-out`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      } catch (err) {
        console.warn('[PukuBotApi] Server sign-out error (ignored):', err);
      }
    }

    this.token = null;
    this.user = null;

    await secureStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);

    this.notifyAuthChange();
  }

  /**
   * Tests connection to baseUrl and checks if single-user mode or valid session is active.
   */
  public async checkConnectionAndAuth(): Promise<{
    reachable: boolean;
    authenticated: boolean;
    isSingleUser?: boolean;
    user?: PukuBotUser | null;
    error?: string;
  }> {
    await this.init();
    try {
      // 1. Try /me with current auth headers
      const res = await fetch(`${this.baseUrl}/me`, {
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const body = await res.json().catch(() => null);
        const userData = (body?.user || body) as PukuBotUser | null;
        if (userData) {
          this.user = userData;
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
          const isSingle = !this.token;
          if (isSingle) {
            // Local Pukubot server in PUKUBOT_SINGLE_USER=true mode
            this.token = 'single-user-dev-session';
            await secureStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
          }
          this.notifyAuthChange();
          return { reachable: true, authenticated: true, isSingleUser: isSingle, user: userData };
        }
      }

      if (res.status === 401) {
        return { reachable: true, authenticated: false };
      }

      // 2. Check /openapi.json as fallback reachability probe
      const openApiRes = await fetch(`${this.baseUrl}/openapi.json`).catch(() => null);
      if (openApiRes && openApiRes.ok) {
        return { reachable: true, authenticated: false };
      }

      return { reachable: false, authenticated: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return {
        reachable: false,
        authenticated: false,
        error: err.message || 'Cannot reach Puku Bot server',
      };
    }
  }

  /**
   * Turns a failed response into a readable Error. The API answers
   * `{ "error": "A sentence a person can read." }`; a 401 means the session
   * ended, so the token is cleared before throwing.
   */
  private async errorFrom(res: Response, fallback: string): Promise<Error> {
    if (res.status === 401) {
      await this.signOut();
      return new Error('Session expired. Please sign in again.');
    }
    const body = await res.json().catch(() => null);
    return new Error(body?.error || fallback);
  }

  private getAuthHeaders(additional?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...additional,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // USER & BOTS
  // ══════════════════════════════════════════════════════════════════════════

  public async getMe(): Promise<PukuBotUser> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/me`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user profile.');
    }
    const data = await res.json();
    // GET /me answers { user: {...} }.
    const user: PukuBotUser = data?.user || data;
    this.user = user;
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  }

  /**
   * Soft-deletes the account (DELETE /me). The server refuses anything but
   * `{ "confirm": "DELETE" }`; every session ends, so the token is cleared.
   */
  public async deleteAccount(): Promise<void> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/me`, {
      method: 'DELETE',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    // 404: the account was already deleted, which is the outcome asked for.
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      throw await this.errorFrom(res, 'Failed to delete account.');
    }
    await this.signOut();
  }

  public async getPersonalInstructions(): Promise<PukuBotInstructions> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/settings/instructions`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const instructions = data.instructions || '';
        await AsyncStorage.setItem(STORAGE_KEYS.INSTRUCTIONS, instructions);
        return { instructions, updatedAt: data.updatedAt };
      }
    } catch {}
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUCTIONS);
    return { instructions: cached || '' };
  }

  public async updatePersonalInstructions(instructions: string): Promise<PukuBotInstructions> {
    await this.init();
    if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      throw new Error(`Instructions can be at most ${MAX_INSTRUCTIONS_LENGTH} characters.`);
    }
    const res = await fetch(`${this.baseUrl}/settings/instructions`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ instructions }),
    }).catch(() => null);
    if (res && !res.ok) {
      throw await this.errorFrom(res, 'Failed to save instructions.');
    }
    // Saved on the server, or kept on this device while offline.
    await AsyncStorage.setItem(STORAGE_KEYS.INSTRUCTIONS, instructions);
    if (!res) {
      await pukuBotOutbox.enqueue({
        method: 'PUT',
        path: '/settings/instructions',
        body: { instructions },
        userId: this.user?.id,
      });
      return { instructions, updatedAt: new Date().toISOString() };
    }
    return res.json().catch(() => ({ instructions }));
  }

  public async getBots(): Promise<PukuBotItem[]> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list Bots.');
    }
    const data = await res.json();
    return data.bots || [];
  }

  public async getBot(botId: string): Promise<PukuBotItem> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get bot profile.');
    }
    const data = await res.json();
    return data.bot || data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ══════════════════════════════════════════════════════════════════════════

  public async getConversations(
    limit = 20,
    cursor?: string
  ): Promise<{ conversations: PukuBotConversation[]; nextCursor: string | null }> {
    await this.init();
    const query = new URLSearchParams();
    if (limit) query.set('limit', String(limit));
    if (cursor) query.set('cursor', cursor);

    const res = await fetch(`${this.baseUrl}/conversations?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch conversations.');
    }
    return res.json();
  }

  /**
   * Starts a conversation with one Bot, several Bots, or auto-routing by text.
   * Without a botId the server routes it to the person's default Bot or matches by query text.
   */
  public async createConversation(
    params?: string | PukuBotCreateConversationParams
  ): Promise<PukuBotConversation> {
    await this.init();
    let body: Record<string, any> = {};
    if (typeof params === 'string') {
      body = { botId: params };
    } else if (params && typeof params === 'object') {
      if (params.botId) body.botId = params.botId;
      if (params.botIds && params.botIds.length > 0) body.botIds = params.botIds;
      if (params.text) body.text = params.text;
    }

    const res = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start conversation.');
    }
    const data = await res.json();
    return data.routedBy ? { ...data.conversation, routedBy: data.routedBy } : data.conversation;
  }

  public async pinConversation(conversationId: string, pinned = true): Promise<void> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/pin`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pinned }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to pin conversation.');
    }
  }

  public async addBotToConversation(conversationId: string, botId: string): Promise<void> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/bots`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ botId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add bot to conversation.');
    }
  }

  public async getConversation(conversationId: string): Promise<PukuBotConversation> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Conversation not found.');
    }
    const data = await res.json();
    return data.conversation;
  }

  public async deleteConversation(conversationId: string): Promise<void> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete conversation.');
    }
  }

  public async markConversationRead(conversationId: string): Promise<void> {
    await this.init();
    await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    }).catch(ignore('pukuBotApi'));
  }

  /**
   * Uploads a file attachment to the specified conversation (/conversations/:id/attachments)
   */
  public async uploadAttachment(
    conversationId: string,
    fileData: { uri: string; name: string; type: string }
  ): Promise<PukuBotAttachment> {
    await this.init();

    const uploadUrl = `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/attachments`;

    // 1. Try NativePicker fast direct upload
    try {
      const nativeRes = await NativePicker.uploadAttachment(
        uploadUrl,
        fileData.uri,
        fileData.name,
        fileData.type || 'application/octet-stream',
        this.getToken() || undefined
      );
      if (nativeRes && nativeRes.id) {
        return nativeRes as PukuBotAttachment;
      }
    } catch (nativeErr) {
      console.warn('[pukuBotApi] Native upload failed, falling back to fetch:', nativeErr);
    }

    // 2. Fallback to standard FormData + fetch
    const formData = new FormData();
    formData.append('file', {
      uri: fileData.uri,
      name: fileData.name,
      type: fileData.type || 'application/octet-stream',
    } as any);

    const res = await fetch(
      uploadUrl,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      }
    );

    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload attachment.');
    }

    const data = await res.json();
    return data.attachment || data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MESSAGES & STREAMING
  // ══════════════════════════════════════════════════════════════════════════

  public async getMessages(
    conversationId: string,
    limit = 50,
    before?: string
  ): Promise<{ messages: PukuBotMessage[]; hasMore: boolean; answering: boolean }> {
    await this.init();
    const query = new URLSearchParams();
    if (limit) query.set('limit', String(limit));
    if (before) query.set('before', before);

    const res = await fetch(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages?${query.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get messages.');
    }
    return res.json();
  }

  /**
   * Sends a message (POST /conversations/:id/messages) and streams the reply.
   *
   * The reply keeps running on the server when the connection drops, so a
   * dropped or truncated stream is resumed from the last event id through
   * GET /conversations/:id/events, falling back to polling /messages.
   * `abort()` stops the reply on the server; `detach()` only stops listening.
   */
  public sendMessageStream(
    conversationId: string,
    text: string,
    attachments: PukuBotAttachment[] = [],
    onEvent: (event: PukuBotTurnEvent) => void,
    options?: { botId?: string; skills?: string[] }
  ): { abort: () => void; detach: () => void } {
    const payload = JSON.stringify({
      text,
      attachments: attachments.map(a => ({
        id: a.id,
        name: a.name || undefined,
        mimeType: a.mimeType || undefined,
      })),
      ...(options?.botId ? { botId: options.botId } : {}),
      ...(options?.skills && options.skills.length > 0 ? { skills: options.skills } : {}),
    });

    const follower = this.followTurn(conversationId, onEvent);
    follower.start(
      'POST',
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
      payload
    );
    return {
      abort: () => {
        follower.detach();
        this.stopTurn(conversationId).catch(ignore('pukuBotApi'));
      },
      detach: follower.detach,
    };
  }

  /**
   * Resumes a reply's event stream (GET /conversations/:id/events), sending
   * the last event id received so nothing is replayed twice.
   */
  public resumeEventsStream(
    conversationId: string,
    onEvent: (event: PukuBotTurnEvent) => void,
    fromEventId?: string
  ): { abort: () => void } {
    const follower = this.followTurn(conversationId, onEvent, fromEventId);
    follower.resume();
    return { abort: follower.detach };
  }

  private eventsUrl(conversationId: string, fromEventId?: string): string {
    const base = `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/events`;
    return fromEventId ? `${base}?from=${encodeURIComponent(fromEventId)}` : base;
  }

  /**
   * Follows one reply from start to `turn.completed` / `turn.failed`, across
   * reconnects. Exactly one terminal event reaches `onEvent`.
   */
  private followTurn(
    conversationId: string,
    onEvent: (event: PukuBotTurnEvent) => void,
    initialEventId?: string
  ) {
    let lastEventId = initialEventId;
    let finished = false;
    let detached = false;
    let resumeAttempts = 0;
    let current: { abort: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const emit = (event: PukuBotTurnEvent) => {
      if (finished || detached) return;
      if (event.type === 'turn.completed' || event.type === 'turn.failed') {
        finished = true;
      }
      onEvent(event);
    };

    const deliver = (msg: SseMessage) => {
      if (msg.id) lastEventId = msg.id;
      if (msg.event === 'ping' || !msg.data) return;
      try {
        const parsed = JSON.parse(msg.data);
        if (!parsed.type && msg.event) parsed.type = msg.event;
        if (parsed.type === 'ping') return;
        if (msg.id) parsed.eventId = msg.id;
        resumeAttempts = 0;
        emit(parsed);
      } catch (e) {
        console.warn('[PukuBotApi] Failed to parse SSE event data:', msg.data, e);
      }
    };

    const poll = () => {
      if (finished || detached) return;
      this.pollTurnUntilDone(conversationId, emit, () => detached || finished);
    };

    const resume = () => {
      if (finished || detached) return;
      if (resumeAttempts >= MAX_RESUME_ATTEMPTS) {
        poll();
        return;
      }
      resumeAttempts++;
      const headers: Record<string, string> = {};
      if (lastEventId) headers['Last-Event-ID'] = lastEventId;
      current = this.openSse('GET', this.eventsUrl(conversationId, lastEventId), undefined, headers, handlers);
    };

    const scheduleResume = () => {
      if (finished || detached) return;
      timer = setTimeout(resume, RESUME_DELAY_MS * Math.max(1, resumeAttempts));
    };

    const handlers: SseHandlers = {
      onMessage: deliver,
      onEnd: (status, responseText, sawEvents) => {
        if (finished || detached) return;
        if (status === 401) {
          this.signOut().catch(ignore('pukuBotApi'));
          emit({ type: 'turn.failed', code: 'error', message: 'Session expired. Please sign in again.' });
          return;
        }
        if (status === 202) {
          // Fire-and-forget answer: read the reply from the events stream.
          resume();
          return;
        }
        if (status >= 400) {
          let message = 'Failed to send message.';
          try {
            const body = JSON.parse(responseText);
            message = body.error || message;
          } catch {}
          emit({ type: 'turn.failed', code: status === 409 ? 'busy' : 'error', message });
          return;
        }
        if (!sawEvents) {
          // /events answers JSON when there is nothing to resume on this server.
          try {
            const body = JSON.parse(responseText);
            if (body && typeof body.answering === 'boolean') {
              poll();
              return;
            }
          } catch {}
        }
        // The stream ended before the reply did: pick it up again.
        scheduleResume();
      },
      onNetworkError: scheduleResume,
    };

    return {
      start: (method: 'GET' | 'POST', url: string, body?: string) => {
        current = this.openSse(method, url, body, { 'Content-Type': 'application/json' }, handlers);
      },
      resume,
      detach: () => {
        detached = true;
        if (timer) clearTimeout(timer);
        current?.abort();
      },
    };
  }

  /** Opens one `text/event-stream` request over XHR (fetch cannot stream in RN). */
  private openSse(
    method: 'GET' | 'POST',
    url: string,
    body: string | undefined,
    extraHeaders: Record<string, string>,
    handlers: SseHandlers
  ): { abort: () => void } {
    const xhr = new XMLHttpRequest();
    let aborted = false;
    let processed = 0;
    let sawEvents = false;
    const parser = createSseParser(msg => {
      if (aborted) return;
      sawEvents = true;
      handlers.onMessage(msg);
    });
    const feed = () => {
      const text = xhr.responseText || '';
      if (text.length > processed) {
        parser.push(text.slice(processed));
        processed = text.length;
      }
    };

    xhr.open(method, url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    const activeToken = this.getToken();
    if (activeToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    }
    Object.entries(extraHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.onprogress = () => {
      if (!aborted && xhr.status < 400) feed();
    };
    xhr.onload = () => {
      if (aborted) return;
      if (xhr.status < 400) {
        feed();
        parser.flush();
      }
      handlers.onEnd(xhr.status, xhr.responseText || '', sawEvents);
    };
    xhr.onerror = () => {
      if (!aborted) handlers.onNetworkError();
    };
    xhr.send(body ?? null);

    return {
      abort: () => {
        aborted = true;
        try {
          xhr.abort();
        } catch {}
      },
    };
  }

  /**
   * Polling fallback: reads /messages until `answering` is false, then
   * reports the newest reply.
   */
  private async pollTurnUntilDone(
    conversationId: string,
    onEvent: (event: PukuBotTurnEvent) => void,
    isCancelled: () => boolean = () => false
  ): Promise<void> {
    let attempts = 0;

    const poll = async () => {
      if (isCancelled()) return;
      attempts++;
      try {
        const data = await this.getMessages(conversationId, 1);
        if (isCancelled()) return;
        if (data.answering && attempts < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        if (data.answering) {
          onEvent({ type: 'turn.failed', code: 'timeout', message: 'The reply is taking too long.' });
          return;
        }
        const latest = data.messages[data.messages.length - 1];
        if (latest && latest.role === 'assistant') {
          onEvent({
            type: 'message.completed',
            messageId: latest.id,
            text: latest.text,
          });
        }
        onEvent({ type: 'turn.completed' });
      } catch (err: any) {
        if (isCancelled()) return;
        onEvent({
          type: 'turn.failed',
          code: 'error',
          message: err.message || 'Error checking turn status',
        });
      }
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  }

  public async stopTurn(conversationId: string): Promise<void> {
    await this.init();
    await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    }).catch(ignore('pukuBotApi'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPUTER & HUMAN-IN-THE-LOOP CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  public async getComputer(botId: string): Promise<PukuBotComputerInfo> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer`, {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get computer status.');
    }
    return res.json();
  }

  public getScreenshotUrl(botId: string): string {
    return `${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer/screenshot`;
  }

  /**
   * Image source for the screenshot. The endpoint needs the bearer token, so
   * a plain `{ uri }` would load a 401; `cacheBust` forces a fresh frame.
   */
  public getScreenshotSource(
    botId: string,
    cacheBust?: number
  ): { uri: string; headers?: Record<string, string> } {
    const uri = cacheBust
      ? `${this.getScreenshotUrl(botId)}?t=${cacheBust}`
      : this.getScreenshotUrl(botId);
    const token = this.getToken();
    return token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };
  }

  public async takeComputerControl(botId: string): Promise<{ ok: boolean; control: PukuBotControlState }> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer/control/take`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to take computer control.');
    }
    return res.json();
  }

  public async releaseComputerControl(botId: string): Promise<{ ok: boolean; control: PukuBotControlState }> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer/control/release`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to release computer control.');
    }
    return res.json();
  }

  public async sendComputerSecret(botId: string, text: string): Promise<{ ok: boolean }> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer/secret`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit secret.');
    }
    return res.json();
  }

  public async rebuildComputer(botId: string): Promise<{ ok: boolean }> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/bots/${encodeURIComponent(botId)}/computer/rebuild`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ confirm: 'REBUILD' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to rebuild computer.');
    }
    return res.json().catch(() => ({ ok: true }));
  }

  public getTaskFileDownloadUrl(botId: string, filePath: string): string {
    return `${this.baseUrl}/bots/${encodeURIComponent(botId)}/files/download?path=${encodeURIComponent(filePath)}`;
  }

  public async downloadFile(botId: string, filePath: string): Promise<string> {
    await this.init();
    const url = this.getTaskFileDownloadUrl(botId, filePath);
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) {
      throw await this.errorFrom(res, 'Failed to download file.');
    }
    return res.text();
  }

  public getComputerStreamWsUrl(botId: string): string {
    const wsProto = this.baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = this.baseUrl.replace(/^https?:\/\//, '').split('/')[0];
    return `${wsProto}//${host}/api/computers/${encodeURIComponent(botId)}/stream`;
  }

  public getComputerDesktopWsUrl(botId: string): string {
    const wsProto = this.baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = this.baseUrl.replace(/^https?:\/\//, '').split('/')[0];
    return `${wsProto}//${host}/api/computers/${encodeURIComponent(botId)}/desktop`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIVE INBOX (GET /events)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Live inbox (GET /events): the conversation list as it changes. Stays
   * connected until `abort()`: reconnects with backoff and Last-Event-ID
   * when the stream ends or the network drops, and stops on 401.
   */
  public subscribeLiveInbox(
    onEvent: (event: any) => void,
    onStatus?: (status: 'connected' | 'reconnecting' | 'closed') => void
  ): { abort: () => void } {
    let stopped = false;
    let lastEventId: string | undefined;
    let failures = 0;
    let current: { abort: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reconnect = () => {
      if (stopped) return;
      failures++;
      onStatus?.('reconnecting');
      const delay = Math.min(INBOX_MAX_BACKOFF_MS, INBOX_BASE_BACKOFF_MS * 2 ** (failures - 1));
      timer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (stopped) return;
      const headers: Record<string, string> = {};
      if (lastEventId) headers['Last-Event-ID'] = lastEventId;
      current = this.openSse('GET', `${this.baseUrl}/events`, undefined, headers, {
        onMessage: msg => {
          if (msg.id) lastEventId = msg.id;
          if (failures > 0) {
            failures = 0;
            onStatus?.('connected');
          }
          if (msg.event === 'ping' || !msg.data) return;
          try {
            const data = JSON.parse(msg.data);
            if (data && !data.type && msg.event) data.type = msg.event;
            onEvent(data);
          } catch {}
        },
        onEnd: status => {
          if (stopped) return;
          if (status === 401) {
            stopped = true;
            onStatus?.('closed');
            this.signOut().catch(ignore('pukuBotApi'));
            return;
          }
          reconnect();
        },
        onNetworkError: reconnect,
      });
    };

    connect();
    return {
      abort: () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        current?.abort();
        onStatus?.('closed');
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MEMORY, ROUTINES, SKILLS, CONNECTIONS (P1)
  //
  // Offline resiliency: when the server cannot be reached, reads come from
  // the AsyncStorage cache and edits are kept on this device. When the server
  // answers with an error, that error is surfaced instead of a fake success.
  // ══════════════════════════════════════════════════════════════════════════

  /** fetch that resolves to null when the network (not the server) fails. */
  private async tryFetch(path: string, init?: RequestInit): Promise<Response | null> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.getAuthHeaders(
          init?.body ? { 'Content-Type': 'application/json' } : undefined
        ),
      });
      return res || null;
    } catch {
      return null;
    }
  }

  private async readCache<T>(key: string): Promise<T[]> {
    const cached = await AsyncStorage.getItem(key).catch(() => null);
    if (!cached) return [];
    try {
      const list = JSON.parse(cached);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  private async writeCache<T>(key: string, list: T[]): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(list)).catch(ignore('pukuBotApi'));
  }

  public async getMemories(botId?: string): Promise<PukuBotMemory[]> {
    await this.init();
    const res = await this.tryFetch(
      botId ? `/memory?botId=${encodeURIComponent(botId)}` : '/memory'
    );
    if (res) {
      if (!res.ok) throw await this.errorFrom(res, 'Failed to load memories.');
      const data = await res.json();
      const list = Array.isArray(data.memories) ? data.memories : Array.isArray(data) ? data : [];
      await this.writeCache(STORAGE_KEYS.MEMORIES, list);
      return list;
    }
    const list = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    return botId ? list.filter(m => !m.botId || m.botId === botId) : list;
  }

  public async createMemory(content: string, botId?: string): Promise<PukuBotMemory> {
    await this.init();
    const res = await this.tryFetch('/memory', {
      method: 'POST',
      body: JSON.stringify({ content, botId }),
    });
    const current = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    let created: PukuBotMemory;
    if (res) {
      if (!res.ok) throw await this.errorFrom(res, 'Failed to add memory.');
      const data = await res.json();
      created = data.memory || data;
    } else {
      created = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        botId: botId || null,
        content,
        shared: false,
        createdAt: new Date().toISOString(),
      };
      await pukuBotOutbox.enqueue({
        method: 'POST',
        path: '/memory',
        body: { content, botId },
        tempId: created.id,
        userId: this.user?.id,
      });
    }
    await this.writeCache(STORAGE_KEYS.MEMORIES, [created, ...current]);
    return created;
  }

  public async updateMemory(id: string, content: string): Promise<PukuBotMemory> {
    await this.init();
    const res = await this.tryFetch(`/memory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    if (res && !res.ok) throw await this.errorFrom(res, 'Failed to update memory.');
    const current = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    const local = current.find(m => m.id === id);
    let updated: PukuBotMemory | undefined;
    if (res) {
      const data = await res.json().catch(() => null);
      updated = data?.memory || (data?.id ? data : undefined);
    } else {
      await pukuBotOutbox.enqueue({
        method: 'PUT',
        path: `/memory/${encodeURIComponent(id)}`,
        body: { content },
        userId: this.user?.id,
      });
    }
    updated = updated || (local ? { ...local, content, updatedAt: new Date().toISOString() } : undefined);
    if (!updated) throw new Error('Memory not found');
    await this.writeCache(
      STORAGE_KEYS.MEMORIES,
      current.map(m => (m.id === id ? (updated as PukuBotMemory) : m))
    );
    return updated;
  }

  public async deleteMemory(id: string): Promise<void> {
    await this.init();
    const res = await this.tryFetch(`/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res && !res.ok && res.status !== 404) {
      throw await this.errorFrom(res, 'Failed to delete memory.');
    }
    if (!res) {
      await pukuBotOutbox.enqueue({
        method: 'DELETE',
        path: `/memory/${encodeURIComponent(id)}`,
        userId: this.user?.id,
      });
    }
    const current = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    await this.writeCache(STORAGE_KEYS.MEMORIES, current.filter(m => m.id !== id));
  }

  public async shareMemory(id: string): Promise<void> {
    await this.setMemoryShared(id, true);
  }

  public async unshareMemory(id: string): Promise<void> {
    await this.setMemoryShared(id, false);
  }

  private async setMemoryShared(id: string, shared: boolean): Promise<void> {
    await this.init();
    const res = await this.tryFetch(
      `/memory/${encodeURIComponent(id)}/${shared ? 'share' : 'unshare'}`,
      { method: 'POST' }
    );
    if (res && !res.ok) throw await this.errorFrom(res, 'Failed to update memory.');
    if (!res) {
      await pukuBotOutbox.enqueue({
        method: 'POST',
        path: `/memory/${encodeURIComponent(id)}/${shared ? 'share' : 'unshare'}`,
        userId: this.user?.id,
      });
    }
    const current = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    await this.writeCache(
      STORAGE_KEYS.MEMORIES,
      current.map(m => (m.id === id ? { ...m, shared } : m))
    );
  }

  public async getRoutines(): Promise<PukuBotRoutine[]> {
    await this.init();
    const res = await this.tryFetch('/routines');
    if (res) {
      if (!res.ok) throw await this.errorFrom(res, 'Failed to load routines.');
      const data = await res.json();
      const list = Array.isArray(data.routines) ? data.routines : Array.isArray(data) ? data : [];
      await this.writeCache(STORAGE_KEYS.ROUTINES, list);
      return list;
    }
    return this.readCache<PukuBotRoutine>(STORAGE_KEYS.ROUTINES);
  }

  public async setRoutineEnabled(id: string, enabled: boolean): Promise<PukuBotRoutine> {
    await this.init();
    const res = await this.tryFetch(`/routines/${encodeURIComponent(id)}/enabled`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
    if (res && !res.ok) throw await this.errorFrom(res, 'Failed to update routine.');
    const current = await this.readCache<PukuBotRoutine>(STORAGE_KEYS.ROUTINES);
    let updated: PukuBotRoutine | undefined;
    if (res) {
      const data = await res.json().catch(() => null);
      updated = data?.routine || (data?.id ? data : undefined);
    } else {
      await pukuBotOutbox.enqueue({
        method: 'PUT',
        path: `/routines/${encodeURIComponent(id)}/enabled`,
        body: { enabled },
        userId: this.user?.id,
      });
    }
    const local = current.find(r => r.id === id);
    updated = updated || (local ? { ...local, enabled } : undefined);
    if (!updated) throw new Error('Routine not found');
    await this.writeCache(
      STORAGE_KEYS.ROUTINES,
      current.map(r => (r.id === id ? (updated as PukuBotRoutine) : r))
    );
    return updated;
  }

  public async deleteRoutine(id: string): Promise<void> {
    await this.init();
    const res = await this.tryFetch(`/routines/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res && !res.ok && res.status !== 404) {
      throw await this.errorFrom(res, 'Failed to delete routine.');
    }
    if (!res) {
      await pukuBotOutbox.enqueue({
        method: 'DELETE',
        path: `/routines/${encodeURIComponent(id)}`,
        userId: this.user?.id,
      });
    }
    const current = await this.readCache<PukuBotRoutine>(STORAGE_KEYS.ROUTINES);
    await this.writeCache(STORAGE_KEYS.ROUTINES, current.filter(r => r.id !== id));
  }

  /** The person's own `/` skills (GET /skills). A Bot's skills come from getBot(). */
  public async getSkills(): Promise<PukuBotSkill[]> {
    await this.init();
    const res = await this.tryFetch('/skills');
    if (res) {
      if (!res.ok) throw await this.errorFrom(res, 'Failed to load skills.');
      const data = await res.json();
      const list = Array.isArray(data.skills) ? data.skills : Array.isArray(data) ? data : [];
      await this.writeCache(STORAGE_KEYS.SKILLS, list);
      return list;
    }
    return this.readCache<PukuBotSkill>(STORAGE_KEYS.SKILLS);
  }

  public async saveSkill(
    slug: string,
    skill: { name: string; description?: string; prompt: string }
  ): Promise<PukuBotSkill> {
    await this.init();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const res = await this.tryFetch(`/skills/${encodeURIComponent(cleanSlug)}`, {
      method: 'PUT',
      body: JSON.stringify(skill),
    });
    if (res && !res.ok) throw await this.errorFrom(res, 'Failed to save skill.');
    let saved: PukuBotSkill = { slug: cleanSlug, ...skill };
    if (res) {
      const data = await res.json().catch(() => null);
      saved = data?.skill || saved;
    } else {
      await pukuBotOutbox.enqueue({
        method: 'PUT',
        path: `/skills/${encodeURIComponent(cleanSlug)}`,
        body: skill,
        userId: this.user?.id,
      });
    }
    const current = await this.readCache<PukuBotSkill>(STORAGE_KEYS.SKILLS);
    await this.writeCache(
      STORAGE_KEYS.SKILLS,
      current.filter(s => s.slug !== saved.slug).concat(saved)
    );
    return saved;
  }

  public async deleteSkill(slug: string): Promise<void> {
    await this.init();
    const res = await this.tryFetch(`/skills/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (res && !res.ok && res.status !== 404) {
      throw await this.errorFrom(res, 'Failed to delete skill.');
    }
    if (!res) {
      await pukuBotOutbox.enqueue({
        method: 'DELETE',
        path: `/skills/${encodeURIComponent(slug)}`,
        userId: this.user?.id,
      });
    }
    const current = await this.readCache<PukuBotSkill>(STORAGE_KEYS.SKILLS);
    await this.writeCache(STORAGE_KEYS.SKILLS, current.filter(s => s.slug !== slug));
  }

  public async updateCachedMemoryId(tempId: string, realMemory: PukuBotMemory): Promise<void> {
    const current = await this.readCache<PukuBotMemory>(STORAGE_KEYS.MEMORIES);
    const updated = current.map(m => (m.id === tempId ? { ...m, ...realMemory } : m));
    await this.writeCache(STORAGE_KEYS.MEMORIES, updated);
  }

  public async replayOutbox(): Promise<{ replayed: number; failed: boolean }> {
    await this.init();
    if (!this.isAuthenticated()) return { replayed: 0, failed: false };
    return pukuBotOutbox.replay({
      getBaseUrl: () => this.baseUrl,
      getAuthHeaders: (extra?: Record<string, string>) => this.getAuthHeaders(extra),
      signOut: () => this.signOut(),
      updateCachedMemoryId: (tempId: string, realMemory: any) =>
        this.updateCachedMemoryId(tempId, realMemory),
    });
  }

  public async getConnections(): Promise<PukuBotConnection[]> {
    await this.init();
    const res = await this.tryFetch('/connections');
    if (res) {
      if (!res.ok) throw await this.errorFrom(res, 'Failed to load connected accounts.');
      const data = await res.json();
      const list = Array.isArray(data.connections) ? data.connections : Array.isArray(data) ? data : [];
      await this.writeCache(STORAGE_KEYS.CONNECTIONS, list);
      return list;
    }
    return this.readCache<PukuBotConnection>(STORAGE_KEYS.CONNECTIONS);
  }

  /**
   * POST /connections/:id/connect. Returns the provider's sign-in URL, which
   * finishes by redirecting to the app's deep link. Needs the network.
   */
  public async connectAccount(
    id: string,
    redirectUri?: string
  ): Promise<{ url?: string; authUrl?: string; redirectUri: string }> {
    await this.init();
    const redirect = redirectUri || ENV.PUKU_BOT_REDIRECT_URI || 'pukubot://auth/callback';
    const res = await this.tryFetch(`/connections/${encodeURIComponent(id)}/connect`, {
      method: 'POST',
      body: JSON.stringify({ redirectUri: redirect }),
    });
    if (!res) throw new Error('Cannot reach Puku Bot. Check your connection and try again.');
    if (!res.ok) throw await this.errorFrom(res, 'Failed to start connecting this account.');
    const data = await res.json().catch(() => ({}));
    return { ...data, url: data.url || data.authUrl, redirectUri: redirect };
  }

  /** POST /connections/:id/confirm, for brokered apps after the browser step. */
  public async confirmConnection(id: string, code?: string): Promise<{ ok: boolean }> {
    await this.init();
    const res = await this.tryFetch(`/connections/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(code ? { code } : {}),
    });
    if (!res) throw new Error('Cannot reach Puku Bot. Check your connection and try again.');
    if (!res.ok) throw await this.errorFrom(res, 'Failed to confirm the connection.');
    return res.json().catch(() => ({ ok: true }));
  }

  public async deleteConnection(id: string): Promise<void> {
    await this.init();
    const res = await this.tryFetch(`/connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res) throw new Error('Cannot reach Puku Bot. Check your connection and try again.');
    if (!res.ok && res.status !== 404) {
      throw await this.errorFrom(res, 'Failed to disconnect this account.');
    }
    const current = await this.readCache<PukuBotConnection>(STORAGE_KEYS.CONNECTIONS);
    await this.writeCache(
      STORAGE_KEYS.CONNECTIONS,
      current.map(c => (c.id === id ? { ...c, connected: false } : c))
    );
  }
}

export const pukuBotApi = PukuBotApiClient.getInstance();
