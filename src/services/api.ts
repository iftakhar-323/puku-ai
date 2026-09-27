/**
 * Puku AI API Service
 * Handles live REST endpoints, SSE streaming, authentication headers,
 * auto-refresh token recovery, and model routing for puku-ai-2.7, puku-ai-2.8, and opus-4.8.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatModelType } from '../types';
import { ENV } from '../config/env';
import { tokenManager, TOKEN_KEYS } from './tokenManager';

export const API_CONFIG = {
  chatApiUrl: ENV.API_BASE_URL,
  authWebUrl: ENV.AUTH_BASE_URL,
  relayHost: ENV.REMOTE_SESSION_RELAY_HOST,
  clientId: ENV.AUTH_CLIENT_ID,
  redirectUri: ENV.AUTH_REDIRECT_URI,
  dev: {
    chatApiUrl: ENV.API_BASE_URL,
    authWebUrl: ENV.AUTH_BASE_URL,
    relayHost: ENV.REMOTE_SESSION_RELAY_HOST,
  },
  prod: {
    chatApiUrl: ENV.API_BASE_URL,
    authWebUrl: ENV.AUTH_BASE_URL,
    relayHost: ENV.REMOTE_SESSION_RELAY_HOST,
  },
};

// Maps client model type to server API model string
export function mapModelToApi(model: ChatModelType | string): string {
  switch (model) {
    case 'opus-4.8':
    case 'opus':
    case 'claude-opus-4-8':
      return 'opus-4.8';
    case 'puku-ai-2.8':
    case 'puku-2.8':
      return 'puku-2.8';
    case 'puku-ai-2.7':
    case 'puku-2.7':
    default:
      return 'puku-2.7';
  }
}

// Maps server API model string to client model type
export function mapApiToModel(apiModel: string): ChatModelType {
  switch (apiModel) {
    case 'opus-4.8':
    case 'opus':
    case 'claude-opus-4-8':
      return 'opus-4.8';
    case 'puku-2.8':
    case 'puku-ai-2.8':
      return 'puku-ai-2.8';
    case 'puku-2.7':
    case 'puku-ai-2.7':
    default:
      return 'puku-ai-2.7';
  }
}

export interface HealthCheckResult {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  deployedAt?: string;
}

export class PukuApiService {
  private baseUrl = ENV.API_BASE_URL;
  private authToken: string | null = null;

  async initAuthToken(): Promise<string | null> {
    try {
      const validToken = await tokenManager.ensureValidToken();
      if (validToken) {
        this.authToken = validToken;
        return this.authToken;
      }
      const stored = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      if (stored) {
        this.authToken = stored;
      }
      return this.authToken;
    } catch {
      return this.authToken;
    }
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      tokenManager.saveTokens({ accessToken: token }).catch(() => {});
    } else {
      tokenManager.clearTokens().catch(() => {});
    }
  }

  setEnvironment(_env?: 'dev' | 'prod') {
    this.baseUrl = ENV.API_BASE_URL;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getAuthToken(): string | null {
    return this.authToken || tokenManager.getAccessTokenSync();
  }

  /**
   * Authenticated fetch wrapper with automatic 401 token refresh & transparent retry.
   */
  async fetchWithAuth(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    let token = await tokenManager.ensureValidToken();
    if (!token) {
      token = this.authToken;
    }

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });

    // If 401 Unauthorized, attempt refresh and retry once
    if (response.status === 401 && retryCount === 0) {
      try {
        const refreshed = await tokenManager.refreshToken();
        if (refreshed) {
          this.authToken = refreshed;
          return this.fetchWithAuth(url, options, retryCount + 1);
        }
      } catch {}
    }

    return response;
  }

  // Check backend server health (no auth required)
  async checkHealth(): Promise<HealthCheckResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return (await response.json()) as HealthCheckResult;
    } catch {
      return null;
    }
  }

  // Verify auth session
  async verifyAuth(): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Fetch conversations from server
  async fetchConversations(): Promise<any[]> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/conversations`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return json.conversations || [];
    } catch {
      return [];
    }
  }

  // Fetch single conversation details with messages
  async fetchConversation(id: string): Promise<any | null> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/conversations/${id}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  // Update conversation properties (such as model, title, pinned)
  async updateConversation(
    id: string,
    updates: { model?: string; title?: string; projectId?: string | null; pinned?: boolean }
  ): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updates),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Create conversation on server with specified model
  async createConversation(
    model: ChatModelType,
    title?: string,
    projectId?: string
  ): Promise<string | null> {
    try {
      const apiModel = mapModelToApi(model);
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title,
          model: apiModel,
          projectId,
        }),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.conversation?.id || null;
    } catch {
      return null;
    }
  }

  // Delete conversation from server
  async deleteConversation(id: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Generate model response via authentic Puku AI cloud endpoints with 401 recovery
  async generateResponse(
    prompt: string,
    model: ChatModelType,
    conversationId?: string | null,
    onDelta?: (chunk: string) => void,
    isIncognito?: boolean
  ): Promise<{
    text: string;
    thinking?: string;
    model: string;
    conversationId: string;
  }> {
    let token = await tokenManager.ensureValidToken();
    if (!token) {
      token = await this.initAuthToken();
    }
    if (!token) {
      throw new Error('Authentication required. Please sign in to chat with Puku AI.');
    }

    let realConvId = conversationId;
    const apiModel = mapModelToApi(model);

    // If no conversationId or if it is a local temporary ID, create conversation on server
    if (!realConvId || realConvId.startsWith('conv_') || realConvId.startsWith('incog_')) {
      const title = isIncognito
        ? 'Incognito'
        : prompt.trim().slice(0, 40) || 'New chat';
      realConvId = await this.createConversation(model, title);
    } else {
      // Ensure backend conversation model is updated to selected model before sending message
      await this.updateConversation(realConvId, { model: apiModel });
    }

    if (!realConvId) {
      throw new Error('Failed to create or access conversation on server.');
    }

    // Helper to send message request with a specific bearer token
    const sendMessageRequest = async (bearerToken: string) => {
      return fetch(
        `${this.baseUrl}/v1/chat/conversations/${realConvId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json',
          },
          body: JSON.stringify({
            action: 'send',
            content: prompt,
            model: apiModel,
            attachments: [],
          }),
        }
      );
    };

    let response = await sendMessageRequest(token);

    // 401 / Token Expired recovery
    if (!response.ok) {
      let isTokenExpired = response.status === 401;
      let errBody: any = null;

      try {
        const cloned = response.clone();
        errBody = await cloned.json().catch(() => null);
        const errMsg = (errBody?.error?.message || errBody?.message || '').toLowerCase();
        if (
          errMsg.includes('invalid or expired') ||
          errMsg.includes('expired token') ||
          errBody?.error?.code === 'invalid_token'
        ) {
          isTokenExpired = true;
        }
      } catch {}

      if (isTokenExpired) {
        try {
          const refreshedToken = await tokenManager.refreshToken();
          if (refreshedToken) {
            token = refreshedToken;
            this.authToken = refreshedToken;
            // Retry the message request immediately with the refreshed access token
            response = await sendMessageRequest(refreshedToken);
          }
        } catch {
          // If refresh permanently failed, tokenManager notified session expired
        }
      }
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg =
        errJson?.error?.message ||
        errJson?.message ||
        `Puku AI server error (${response.status})`;
      throw new Error(errMsg);
    }

    const bodyText = await response.text();
    let accumulatedText = '';

    const lines = bodyText.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;

      try {
        const json = JSON.parse(payload);
        const choices = json.choices as any[];
        if (choices && choices.length > 0) {
          const delta = choices[0]?.delta?.content;
          if (delta) {
            accumulatedText += delta;
            onDelta?.(delta);
          }
        }
      } catch {}
    }

    // If not SSE, check if standard JSON
    if (!accumulatedText.trim() && bodyText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(bodyText);
        accumulatedText =
          json.content ||
          json.message?.content ||
          json.choices?.[0]?.message?.content ||
          '';
      } catch {}
    }

    if (!accumulatedText.trim()) {
      throw new Error('No response content returned from Puku AI server.');
    }

    return {
      text: accumulatedText,
      model,
      conversationId: realConvId,
    };
  }
}

export const pukuApi = new PukuApiService();
