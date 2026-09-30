/**
 * Puku AI API Service
 * Handles live REST endpoints, SSE streaming, authentication headers,
 * auto-refresh token recovery, and model routing for puku-ai-2.7, puku-ai-2.8, and opus-4.8.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatModelType } from '../types';
import { ENV } from '../config/env';
import { tokenManager, TOKEN_KEYS } from './tokenManager';
import { NativePicker } from './nativeModules';

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
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.conversations)) return json.conversations;
      if (Array.isArray(json.data)) return json.data;
      return [];
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

  // Fetch projects from server
  async fetchProjects(): Promise<any[]> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/projects`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return json.projects || (Array.isArray(json) ? json : []);
    } catch {
      return [];
    }
  }

  // Create project on server
  async createProject(params: {
    name: string;
    description?: string;
    instructions?: string;
    color?: string;
    scope?: string;
  }): Promise<any | null> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.project || json;
    } catch {
      return null;
    }
  }

  // Update project on server
  async updateProject(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      instructions: string;
      color: string;
      scope: string;
    }>
  ): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/projects/${id}`, {
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

  // Delete project from server
  async deleteProject(id: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/chat/projects/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Transcribe audio using Puku AI Whisper/audio endpoint
  async transcribeAudio(audioData: string | FormData, language = 'en'): Promise<string | null> {
    try {
      let body: any;
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (typeof audioData === 'string') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ audio: audioData, language });
      } else {
        body = audioData;
      }

      const response = await this.fetchWithAuth(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) return null;
      const json = await response.json();
      return json.text || json.transcript || null;
    } catch {
      return null;
    }
  }

  // Upload attachment file (photo or document) to conversation
  async uploadAttachment(
    conversationId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<any> {
    let token = await tokenManager.ensureValidToken();
    if (!token) {
      token = await this.initAuthToken();
    }

    const uploadUrl = `${this.baseUrl}/v1/chat/conversations/${conversationId}/attachments`;

    // 1. Try NativePicker fast direct upload
    try {
      const nativeRes = await NativePicker.uploadAttachment(
        uploadUrl,
        file.uri,
        file.name,
        file.type || 'application/octet-stream',
        token || undefined
      );
      if (nativeRes && (nativeRes.id || nativeRes.r2Key)) {
        return nativeRes;
      }
    } catch (nativeErr) {
      console.warn('[pukuApi] Native upload failed, falling back to fetch:', nativeErr);
    }

    // 2. Fallback to standard FormData + fetch
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Failed to upload attachment: ${errText || response.statusText}`);
    }

    const data = await response.json();
    return data.attachment || data;
  }

  // Generate model response via authentic Puku AI cloud endpoints with 401 recovery
  async generateResponse(
    prompt: string,
    model: ChatModelType,
    conversationId?: string | null,
    onDelta?: (chunk: string) => void,
    isIncognito?: boolean,
    attachments?: any[]
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

    const streamPayload = {
      action: 'send',
      content: prompt,
      model: apiModel,
      attachments: attachments && attachments.length > 0 ? attachments : [],
    };
    const streamUrl = `${this.baseUrl}/v1/chat/conversations/${realConvId}/messages`;

    try {
      const streamRes = await this.executeStreamRequest(
        streamUrl,
        token,
        streamPayload,
        onDelta
      );
      return {
        text: streamRes.text,
        model,
        conversationId: realConvId,
      };
    } catch (err: any) {
      const isTokenExpired =
        err?.status === 401 ||
        err?.message?.toLowerCase().includes('token') ||
        err?.message?.toLowerCase().includes('expired');

      if (isTokenExpired) {
        try {
          const refreshedToken = await tokenManager.refreshToken();
          if (refreshedToken) {
            token = refreshedToken;
            this.authToken = refreshedToken;
            const retryRes = await this.executeStreamRequest(
              streamUrl,
              refreshedToken,
              streamPayload,
              onDelta
            );
            return {
              text: retryRes.text,
              model,
              conversationId: realConvId,
            };
          }
        } catch {}
      }
      throw err;
    }
  }

  // Real-time progressive streaming engine supporting SSE chunks and fallback progressive typing
  private executeStreamRequest(
    url: string,
    bearerToken: string,
    payload: any,
    onDelta?: (chunk: string) => void
  ): Promise<{ text: string; status: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${bearerToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream, application/json');

      let lastIndex = 0;
      let buffer = '';
      let accumulatedText = '';

      const processTextChunk = (newText: string) => {
        const slice = newText.substring(lastIndex);
        lastIndex = newText.length;
        if (!slice) return;

        buffer += slice;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data: ')) continue;
          const payloadStr = line.slice(6).trim();
          if (payloadStr === '[DONE]') continue;
          try {
            const json = JSON.parse(payloadStr);
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
      };

      xhr.onprogress = () => {
        try {
          if (xhr.status === 200 || xhr.status === 0) {
            processTextChunk(xhr.responseText || '');
          }
        } catch {}
      };

      xhr.onload = async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            processTextChunk(xhr.responseText || '');

            if (buffer.trim().startsWith('data: ')) {
              const payloadStr = buffer.trim().slice(6).trim();
              if (payloadStr !== '[DONE]') {
                try {
                  const json = JSON.parse(payloadStr);
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    accumulatedText += delta;
                    onDelta?.(delta);
                  }
                } catch {}
              }
            }

            if (!accumulatedText.trim()) {
              const raw = xhr.responseText || '';
              if (raw.trim().startsWith('{')) {
                try {
                  const json = JSON.parse(raw);
                  const fallbackContent =
                    json.content ||
                    json.message?.content ||
                    json.choices?.[0]?.message?.content ||
                    '';
                  if (fallbackContent) {
                    accumulatedText = fallbackContent;
                    await emitProgressively(fallbackContent, onDelta);
                  }
                } catch {}
              } else if (raw.trim()) {
                accumulatedText = raw.trim();
                await emitProgressively(accumulatedText, onDelta);
              }
            }

            if (!accumulatedText.trim()) {
              reject(new Error('No response content returned from Puku AI server.'));
            } else {
              resolve({ text: accumulatedText, status: xhr.status });
            }
          } else {
            let errMsg = `Puku AI server error (${xhr.status})`;
            try {
              const errJson = JSON.parse(xhr.responseText || '');
              errMsg = errJson?.error?.message || errJson?.message || errMsg;
            } catch {}
            const error: any = new Error(errMsg);
            error.status = xhr.status;
            reject(error);
          }
        } catch (e: any) {
          reject(e);
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed. Please check your connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Request timed out. Please try again.'));
      };

      try {
        xhr.send(JSON.stringify(payload));
      } catch (err: any) {
        reject(err);
      }
    });
  }
}

// Progressive smooth token emitter for line-by-line / word-by-word streaming
export async function emitProgressively(
  fullText: string,
  onDelta?: (chunk: string) => void
): Promise<void> {
  if (!onDelta || !fullText) return;
  const tokens = fullText.match(/\S+\s*|\s+/g) || [fullText];
  for (const token of tokens) {
    onDelta(token);
    await new Promise(resolve => setTimeout(() => resolve(undefined), 15));
  }
}

export const pukuApi = new PukuApiService();
