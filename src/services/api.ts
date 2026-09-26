/**
 * Puku AI API Service
 * Handles live REST endpoints, SSE streaming, authentication headers,
 * and model routing for puku-ai-2.7, puku-ai-2.8, and opus-4.8.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatModelType } from '../types';
import { ENV } from '../config/env';

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
      const stored = await AsyncStorage.getItem('@puku_auth_token');
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
      AsyncStorage.setItem('@puku_auth_token', token).catch(() => {});
    } else {
      AsyncStorage.removeItem('@puku_auth_token').catch(() => {});
    }
  }

  setEnvironment(_env?: 'dev' | 'prod') {
    this.baseUrl = ENV.API_BASE_URL;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Check backend server health
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
    if (!this.authToken) return false;
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          Accept: 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Fetch conversations from server
  async fetchConversations(): Promise<any[]> {
    if (!this.authToken) return [];
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/conversations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          Accept: 'application/json',
        },
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
    const token = await this.initAuthToken();
    if (!token) return null;
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/conversations/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
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
    const token = await this.initAuthToken();
    if (!token) return false;
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
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
    const token = await this.initAuthToken();
    if (!token) return null;
    try {
      const apiModel = mapModelToApi(model);
      const response = await fetch(`${this.baseUrl}/v1/chat/conversations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

  getAuthToken(): string | null {
    return this.authToken;
  }

  // Generate model response via authentic Puku AI cloud endpoints
  async generateResponse(
    prompt: string,
    model: ChatModelType,
    conversationId?: string | null,
    onDelta?: (chunk: string) => void
  ): Promise<{
    text: string;
    thinking?: string;
    model: string;
    conversationId: string;
  }> {
    const token = await this.initAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in to chat with Puku AI.');
    }

    let realConvId = conversationId;
    const apiModel = mapModelToApi(model);

    // If no conversationId or if it is a local client ID, create real conversation on server first
    if (!realConvId || realConvId.startsWith('conv_')) {
      const title = prompt.trim().slice(0, 40) || 'New chat';
      realConvId = await this.createConversation(model, title);
    } else {
      // Ensure backend conversation model is updated to selected model before sending message
      await this.updateConversation(realConvId, { model: apiModel });
    }

    if (!realConvId) {
      throw new Error('Failed to create or access conversation on server.');
    }

    // Call /v1/chat/conversations/{id}/messages with explicit model
    const response = await fetch(
      `${this.baseUrl}/v1/chat/conversations/${realConvId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

