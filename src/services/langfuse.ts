/**
 * Langfuse LLM Observability Service for Puku AI.
 * Captures traces, generations, spans, and tool usage across AI Chat & Puku Bot.
 */
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { ENV } from '../config/env';

function toBase64(str: string): string {
  try {
    const globalBtoa = (globalThis as any).btoa;
    if (typeof globalBtoa === 'function') {
      return globalBtoa(str);
    }
  } catch {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

export interface TraceGenerationParams {
  traceId?: string;
  name: string;
  userId?: string;
  sessionId?: string;
  model: string;
  prompt: string | any[] | Record<string, any>;
  completion: string;
  startTime: number;
  endTime?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  level?: 'DEFAULT' | 'WARNING' | 'ERROR';
  statusMessage?: string;
}

export interface TraceSpanParams {
  traceId: string;
  name: string;
  input?: any;
  output?: any;
  startTime: number;
  endTime?: number;
  metadata?: Record<string, any>;
}

class LangfuseService {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.publicKey = ENV.LANGFUSE_PUBLIC_KEY || '';
    this.secretKey = ENV.LANGFUSE_SECRET_KEY || '';
    this.baseUrl = (ENV.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/+$/, '');
    this.isEnabled = this.publicKey.length > 0 && this.secretKey.length > 0;
  }

  /**
   * Traces an entire LLM prompt-completion cycle in Langfuse.
   */
  async traceGeneration(params: TraceGenerationParams): Promise<string> {
    const traceId = params.traceId || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const startIso = new Date(params.startTime).toISOString();
    const endIso = new Date(params.endTime || now).toISOString();

    // Add Sentry breadcrumb for unified observability correlation
    Sentry.addBreadcrumb({
      category: 'langfuse',
      message: `[Langfuse Trace] ${params.name} (${params.model})`,
      data: {
        traceId,
        model: params.model,
        sessionId: params.sessionId,
      },
      level: params.level === 'ERROR' ? 'error' : 'info',
    });

    if (!this.isEnabled) return traceId;

    const traceEvent = {
      id: `evt_${Date.now()}_1`,
      type: 'trace-create',
      timestamp: startIso,
      body: {
        id: traceId,
        name: params.name,
        userId: params.userId,
        sessionId: params.sessionId,
        tags: params.tags || ['mobile', Platform.OS],
        metadata: {
          platform: Platform.OS,
          ...params.metadata,
        },
      },
    };

    const generationEvent = {
      id: `evt_${Date.now()}_2`,
      type: 'generation-create',
      timestamp: endIso,
      body: {
        id: generationId,
        traceId,
        name: params.name,
        model: params.model,
        startTime: startIso,
        endTime: endIso,
        input: params.prompt,
        output: params.completion,
        level: params.level || 'DEFAULT',
        statusMessage: params.statusMessage,
        metadata: params.metadata,
      },
    };

    this.sendBatch([traceEvent, generationEvent]);
    return traceId;
  }

  /**
   * Traces an intermediate agent step or tool call (e.g. web search, command execution).
   */
  async traceSpan(params: TraceSpanParams): Promise<void> {
    if (!this.isEnabled) return;
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startIso = new Date(params.startTime).toISOString();
    const endIso = new Date(params.endTime || Date.now()).toISOString();

    const spanEvent = {
      id: `evt_${Date.now()}_span`,
      type: 'span-create',
      timestamp: endIso,
      body: {
        id: spanId,
        traceId: params.traceId,
        name: params.name,
        startTime: startIso,
        endTime: endIso,
        input: params.input,
        output: params.output,
        metadata: params.metadata,
      },
    };

    this.sendBatch([spanEvent]);
  }

  /**
   * Internal fire-and-forget batch sender with timeout and error handling.
   */
  private async sendBatch(batch: any[]): Promise<void> {
    try {
      const authHeader = 'Basic ' + toBase64(`${this.publicKey}:${this.secretKey}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Langfuse-Public-Key': this.publicKey,
        },
        body: JSON.stringify({ batch }),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
    } catch (err) {
      // Never crash the application on telemetry transmission errors
      if (__DEV__) {
        console.warn('[Langfuse] Failed to dispatch trace batch:', err);
      }
    }
  }
}

export const langfuse = new LangfuseService();
