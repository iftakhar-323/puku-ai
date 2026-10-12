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
  PukuBotSendMessageOptions,
  PukuBotSkill,
  PukuBotTurnEvent,
  PukuBotUser,
} from '../types';
import { generatePkcePair, generateRandomString } from '../utils/auth';
import { NativePicker } from './nativeModules';
import { secureStorage } from './secureStorage';
import { tokenManager } from './tokenManager';
import { ignore } from '../utils/devLog';

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
      } else {
        const appToken =
          (await tokenManager.ensureValidToken().catch(() => null)) ||
          tokenManager.getAccessTokenSync();
        if (appToken) {
          this.token = appToken;
        }
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
    return this.token || tokenManager.getAccessTokenSync();
  }

  public getUser(): PukuBotUser | null {
    return this.user;
  }

  public isAuthenticated(): boolean {
    return !!(this.token || tokenManager.getAccessTokenSync());
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
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
    this.notifyAuthChange();
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
        const userData = (await res.json().catch(() => null)) as PukuBotUser | null;
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

  private getAuthHeaders(additional?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...additional,
    };
    const activeToken = this.token || tokenManager.getAccessTokenSync();
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
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
    this.user = data;
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data));
    return data;
  }

  public async deleteAccount(): Promise<void> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/me`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) {
      await this.signOut();
      throw new Error('Session expired.');
    }
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete account.');
    }
    await this.signOut();
  }

  public async updateOnboarding(step: number): Promise<{ ok: boolean }> {
    await this.init();
    const res = await fetch(`${this.baseUrl}/me/onboarding`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ step }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update onboarding.');
    }
    return res.json().catch(() => ({ ok: true }));
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
    await AsyncStorage.setItem(STORAGE_KEYS.INSTRUCTIONS, instructions);
    try {
      const res = await fetch(`${this.baseUrl}/settings/instructions`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ instructions }),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {}
    return { instructions, updatedAt: new Date().toISOString() };
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
    return data.conversation;
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
        this.token || undefined
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
        headers: {
          Accept: 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
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
    return data.attachment;
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
   * Sends a message and streams SSE events back in real-time.
   * If the connection fails or returns 202, it falls back to polling until answering is false.
   */
  public sendMessageStream(
    conversationId: string,
    text: string,
    attachments: PukuBotAttachment[] = [],
    onEvent: (event: PukuBotTurnEvent) => void,
    options?: { botId?: string; skills?: string[] }
  ): { abort: () => void } {
    let isAborted = false;
    const xhr = new XMLHttpRequest();

    const abort = () => {
      isAborted = true;
      try {
        xhr.abort();
      } catch {}
      this.stopTurn(conversationId).catch(ignore('pukuBotApi'));
    };

    const targetUrl = `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`;
    xhr.open('POST', targetUrl, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Content-Type', 'application/json');
    const activeToken = this.token || tokenManager.getAccessTokenSync();
    if (activeToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    }

    let processedIndex = 0;

    const parseBuffer = (chunk: string) => {
      const parts = chunk.split(/\r?\n\r?\n/);
      // The last element might be incomplete unless chunk ended with double newline
      const completeParts = parts.slice(0, -1);
      const remaining = parts[parts.length - 1];

      for (const block of completeParts) {
        if (!block.trim()) continue;
        const lines = block.split(/\r?\n/);
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const val = line.slice(5).trim();
            dataStr = dataStr ? `${dataStr}\n${val}` : val;
          }
        }

        if (eventType === 'ping') continue;

        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (!parsed.type && eventType) {
              parsed.type = eventType;
            }
            onEvent(parsed);
          } catch (e) {
            console.warn('[PukuBotApi] Failed to parse SSE event data:', dataStr, e);
          }
        }
      }

      return chunk.length - remaining.length;
    };

    xhr.onprogress = () => {
      if (isAborted) return;
      const textSoFar = xhr.responseText || '';
      const newChunk = textSoFar.slice(processedIndex);
      if (newChunk) {
        const advanced = parseBuffer(newChunk);
        processedIndex += advanced;
      }
    };

    xhr.onload = () => {
      if (isAborted) return;
      if (xhr.status === 401) {
        this.signOut();
        onEvent({
          type: 'turn.failed',
          code: 'error',
          message: 'Session expired. Please sign in again.',
        });
        return;
      }

      if (xhr.status === 202) {
        // Fallback polling mode if server replied with 202 instead of SSE
        this.pollTurnUntilDone(conversationId, onEvent);
        return;
      }

      if (xhr.status >= 400) {
        let errMessage = 'Failed to send message.';
        try {
          const body = JSON.parse(xhr.responseText);
          errMessage = body.error || body.message || errMessage;
        } catch {}
        onEvent({
          type: 'turn.failed',
          code: 'error',
          message: errMessage,
        });
        return;
      }

      // Finish parsing remaining buffer
      const textSoFar = xhr.responseText || '';
      const remainingChunk = textSoFar.slice(processedIndex);
      if (remainingChunk.trim()) {
        parseBuffer(`${remainingChunk}\n\n`);
      }
    };

    xhr.onerror = () => {
      if (isAborted) return;
      // Network glitch or unsupported stream - fallback to polling
      this.pollTurnUntilDone(conversationId, onEvent);
    };

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

    xhr.send(payload);

    return { abort };
  }

  /**
   * Polling fallback if SSE is not available or disconnected.
   */
  private async pollTurnUntilDone(
    conversationId: string,
    onEvent: (event: PukuBotTurnEvent) => void
  ): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // Up to 60 seconds

    const poll = async () => {
      attempts++;
      try {
        const data = await this.getMessages(conversationId, 1);
        if (!data.answering || attempts >= maxAttempts) {
          const latest = data.messages[0];
          if (latest && latest.role === 'assistant') {
            onEvent({
              type: 'message.completed',
              messageId: latest.id,
              text: latest.text,
            });
            onEvent({
              type: 'turn.completed',
            });
          } else {
            onEvent({
              type: 'turn.completed',
            });
          }
          return;
        }
        setTimeout(poll, 1000);
      } catch (err: any) {
        onEvent({
          type: 'turn.failed',
          code: 'error',
          message: err.message || 'Error checking turn status',
        });
      }
    };

    setTimeout(poll, 1000);
  }

  public async stopTurn(conversationId: string): Promise<void> {
    await this.init();
    await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    }).catch(ignore('pukuBotApi'));
  }

  /**
   * Resumes a reply's event stream (GET /conversations/:id/events).
   * Reconnects to pick up the SSE stream where it left off.
   */
  public resumeEventsStream(
    conversationId: string,
    onEvent: (event: PukuBotTurnEvent) => void,
    fromEventId?: string
  ): { abort: () => void } {
    let isAborted = false;
    const xhr = new XMLHttpRequest();

    const abort = () => {
      isAborted = true;
      try {
        xhr.abort();
      } catch {}
    };

    const targetUrl = fromEventId
      ? `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/events?from=${encodeURIComponent(fromEventId)}`
      : `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/events`;
    xhr.open('GET', targetUrl, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    if (fromEventId) {
      xhr.setRequestHeader('Last-Event-ID', fromEventId);
    }
    const activeToken = this.token || tokenManager.getAccessTokenSync();
    if (activeToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    }

    let processedIndex = 0;

    const parseBuffer = (chunk: string) => {
      const parts = chunk.split(/\r?\n\r?\n/);
      const completeParts = parts.slice(0, -1);
      const remaining = parts[parts.length - 1];

      for (const block of completeParts) {
        if (!block.trim()) continue;
        const lines = block.split(/\r?\n/);
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const val = line.slice(5).trim();
            dataStr = dataStr ? `${dataStr}\n${val}` : val;
          }
        }

        if (eventType === 'ping') continue;

        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (!parsed.type && eventType) {
              parsed.type = eventType;
            }
            onEvent(parsed);
          } catch (e) {
            console.warn('[PukuBotApi] Failed to parse SSE event data:', dataStr, e);
          }
        }
      }

      return chunk.length - remaining.length;
    };

    xhr.onprogress = () => {
      if (isAborted) return;
      const textSoFar = xhr.responseText || '';
      const newChunk = textSoFar.slice(processedIndex);
      if (newChunk) {
        const advanced = parseBuffer(newChunk);
        processedIndex += advanced;
      }
    };

    xhr.onload = () => {
      if (isAborted) return;
      if (xhr.status === 401) {
        this.signOut();
        onEvent({
          type: 'turn.failed',
          code: 'error',
          message: 'Session expired. Please sign in again.',
        });
        return;
      }

      const textSoFar = xhr.responseText || '';
      const remainingChunk = textSoFar.slice(processedIndex);
      if (remainingChunk.trim()) {
        parseBuffer(`${remainingChunk}\n\n`);
      }
    };

    xhr.onerror = () => {
      if (isAborted) return;
      this.pollTurnUntilDone(conversationId, onEvent);
    };

    xhr.send();

    return { abort };
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

  public subscribeLiveInbox(onEvent: (event: any) => void): { abort: () => void } {
    let isAborted = false;
    const xhr = new XMLHttpRequest();

    const abort = () => {
      isAborted = true;
      try {
        xhr.abort();
      } catch {}
    };

    const targetUrl = `${this.baseUrl}/events`;
    xhr.open('GET', targetUrl, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    const activeToken = this.token || tokenManager.getAccessTokenSync();
    if (activeToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    }

    let processedIndex = 0;
    xhr.onprogress = () => {
      if (isAborted) return;
      const text = xhr.responseText || '';
      const chunk = text.slice(processedIndex);
      processedIndex = text.length;

      const lines = chunk.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            onEvent(data);
          } catch {}
        }
      }
    };

    xhr.send();
    return { abort };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MEMORY (GET/POST/PUT/DELETE /memory)
  // ══════════════════════════════════════════════════════════════════════════

  public async getMemories(botId?: string): Promise<PukuBotMemory[]> {
    await this.init();
    try {
      const url = botId
        ? `${this.baseUrl}/memory?botId=${encodeURIComponent(botId)}`
        : `${this.baseUrl}/memory`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.memories) ? data.memories : Array.isArray(data) ? data : [];
        await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(list));
        return list;
      }
    } catch {}

    const cached = await AsyncStorage.getItem(STORAGE_KEYS.MEMORIES);
    if (cached) {
      try {
        const list: PukuBotMemory[] = JSON.parse(cached);
        return botId ? list.filter(m => !m.botId || m.botId === botId) : list;
      } catch {}
    }
    return [];
  }

  public async createMemory(content: string, botId?: string): Promise<PukuBotMemory> {
    await this.init();
    const newMemory: PukuBotMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      botId: botId || null,
      content,
      shared: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${this.baseUrl}/memory`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content, botId }),
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.memory || data;
        const current = await this.getMemories();
        await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify([created, ...current]));
        return created;
      }
    } catch {}

    const current = await this.getMemories();
    const updated = [newMemory, ...current];
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(updated));
    return newMemory;
  }

  public async updateMemory(id: string, content: string): Promise<PukuBotMemory> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/memory/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.memory || data;
      }
    } catch {}

    const current = await this.getMemories();
    const target = current.find(m => m.id === id);
    if (target) {
      target.content = content;
      target.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(current));
      return target;
    }
    throw new Error('Memory not found');
  }

  public async deleteMemory(id: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/memory/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch {}

    const current = await this.getMemories();
    const filtered = current.filter(m => m.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(filtered));
  }

  public async shareMemory(id: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/memory/${encodeURIComponent(id)}/share`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {}

    const current = await this.getMemories();
    const target = current.find(m => m.id === id);
    if (target) {
      target.shared = true;
      await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(current));
    }
  }

  public async unshareMemory(id: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/memory/${encodeURIComponent(id)}/unshare`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {}

    const current = await this.getMemories();
    const target = current.find(m => m.id === id);
    if (target) {
      target.shared = false;
      await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(current));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ROUTINES (GET/PUT/DELETE /routines)
  // ══════════════════════════════════════════════════════════════════════════

  public async getRoutines(): Promise<PukuBotRoutine[]> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/routines`, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.routines) ? data.routines : Array.isArray(data) ? data : [];
        await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(list));
        return list;
      }
    } catch {}

    const cached = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return [];
  }

  public async setRoutineEnabled(id: string, enabled: boolean): Promise<PukuBotRoutine> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/routines/${encodeURIComponent(id)}/enabled`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.routine || data;
      }
    } catch {}

    const current = await this.getRoutines();
    const target = current.find(r => r.id === id);
    if (target) {
      target.enabled = enabled;
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(current));
      return target;
    }
    throw new Error('Routine not found');
  }

  public async deleteRoutine(id: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/routines/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch {}

    const current = await this.getRoutines();
    const filtered = current.filter(r => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(filtered));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SKILLS (GET/PUT/DELETE /skills)
  // ══════════════════════════════════════════════════════════════════════════

  public async getSkills(): Promise<PukuBotSkill[]> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/skills`, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.skills) ? data.skills : Array.isArray(data) ? data : [];
        await AsyncStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(list));
        return list;
      }
    } catch {}

    const cached = await AsyncStorage.getItem(STORAGE_KEYS.SKILLS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return [
      { slug: 'web-search', name: 'Web Search', description: 'Search Google or Wikipedia for recent info', prompt: 'Search the web for {query}' },
      { slug: 'code-review', name: 'Code Review', description: 'Review code structure and debug issues', prompt: 'Perform a detailed code review of {code}' },
      { slug: 'summarize', name: 'Summarize', description: 'Create a concise bullet point summary', prompt: 'Summarize the following clearly: {text}' },
    ];
  }

  public async saveSkill(
    slug: string,
    skill: { name: string; description?: string; prompt: string }
  ): Promise<PukuBotSkill> {
    await this.init();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const fullSkill: PukuBotSkill = {
      slug: cleanSlug,
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
    };

    try {
      const res = await fetch(`${this.baseUrl}/skills/${encodeURIComponent(cleanSlug)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(skill),
      });
      if (res.ok) {
        const data = await res.json();
        const saved = data.skill || fullSkill;
        const current = await this.getSkills();
        const updated = current.filter(s => s.slug !== cleanSlug).concat(saved);
        await AsyncStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(updated));
        return saved;
      }
    } catch {}

    const current = await this.getSkills();
    const updated = current.filter(s => s.slug !== cleanSlug).concat(fullSkill);
    await AsyncStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(updated));
    return fullSkill;
  }

  public async deleteSkill(slug: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/skills/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch {}

    const current = await this.getSkills();
    const filtered = current.filter(s => s.slug !== slug);
    await AsyncStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(filtered));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONNECTED ACCOUNTS (GET/POST/DELETE /connections)
  // ══════════════════════════════════════════════════════════════════════════

  public async getConnections(): Promise<PukuBotConnection[]> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/connections`, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.connections) ? data.connections : Array.isArray(data) ? data : [];
        await AsyncStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(list));
        return list;
      }
    } catch {}

    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTIONS);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return [
      { id: 'google_drive', service: 'Google Drive', name: 'Google Drive', connected: false },
      { id: 'github', service: 'GitHub', name: 'GitHub', connected: false },
      { id: 'notion', service: 'Notion', name: 'Notion', connected: false },
      { id: 'slack', service: 'Slack', name: 'Slack', connected: false },
    ];
  }

  public async connectAccount(id: string, redirectUri?: string): Promise<{ url?: string; authUrl?: string }> {
    await this.init();
    const redirect = redirectUri || ENV.PUKU_BOT_REDIRECT_URI || 'pukubot://auth/callback';
    try {
      const res = await fetch(`${this.baseUrl}/connections/${encodeURIComponent(id)}/connect`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ redirectUri: redirect }),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {}
    return { url: `${this.baseUrl}/connections/${encodeURIComponent(id)}/oauth?redirect_uri=${encodeURIComponent(redirect)}` };
  }

  public async confirmConnection(id: string, code?: string): Promise<{ ok: boolean }> {
    await this.init();
    try {
      const res = await fetch(`${this.baseUrl}/connections/${encodeURIComponent(id)}/confirm`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {}
    const current = await this.getConnections();
    const target = current.find(c => c.id === id);
    if (target) {
      target.connected = true;
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(current));
    }
    return { ok: true };
  }

  public async deleteConnection(id: string): Promise<void> {
    await this.init();
    try {
      await fetch(`${this.baseUrl}/connections/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch {}
    const current = await this.getConnections();
    const target = current.find(c => c.id === id);
    if (target) {
      target.connected = false;
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(current));
    }
  }
}

export const pukuBotApi = PukuBotApiClient.getInstance();

