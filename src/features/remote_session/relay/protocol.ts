/**
 * Puku remote-control relay protocol, as a pure state reducer.
 *
 * The WebSocket lives in RemoteSessionContext; every frame it receives goes
 * through `applyFrame`, which returns the next state plus side effects for the
 * caller to run (send a reply, vibrate, persist the reconnect token, close).
 * Keeping this free of React and sockets makes it unit-testable.
 *
 * Protocol reference: puku-app-flutter/_bmad-output/REMOTE_SESSION_GUIDE.md
 */

export type ConnectionPhase =
  | 'idle' // never connected
  | 'connecting' // socket handshake in progress
  | 'open' // socket open, CLI not attached (yet, or it dropped)
  | 'attached' // CLI attached: safe to send prompts
  | 'reconnecting' // socket dropped, retrying with backoff
  | 'closed'; // session over; do not retry

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'auto';

export const PERMISSION_MODES: {
  mode: PermissionMode;
  label: string;
  description: string;
}[] = [
  {
    mode: 'default',
    label: 'Ask',
    description: 'Prompts before risky operations',
  },
  {
    mode: 'acceptEdits',
    label: 'Accept edits',
    description: 'Auto-accepts file edits; still asks for commands',
  },
  {
    mode: 'plan',
    label: 'Plan',
    description: 'Planning only, no tool execution',
  },
  {
    mode: 'auto',
    label: 'Auto',
    description: 'Autopilot (may be unavailable)',
  },
];

/** Offered in the model picker; the CLI's own allowlist has the final say. */
export const REMOTE_MODELS = ['puku-ai-2.7', 'puku-ai-2.8', 'opus-4-8'];

export interface ToolCall {
  name: string;
  input: Record<string, any>;
  status: 'running' | 'success' | 'error';
  output?: string;
}

export type RemoteEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string; streaming?: boolean }
  | { kind: 'tool'; id: string; tool: ToolCall }
  | { kind: 'system'; id: string; text: string; tone: 'info' | 'error' };

/** A new entry; `id` is generated unless given (tool entries reuse the tool_use id). */
export type NewEntry = RemoteEntry extends infer E
  ? E extends RemoteEntry
    ? Omit<E, 'id'> & { id?: string }
    : never
  : never;

export interface AskQuestion {
  question: string;
  header?: string;
  multiSelect?: boolean;
  options: { label: string; description?: string }[];
}

/** A `can_use_tool` request waiting for the user's answer. */
export interface PendingPrompt {
  requestId: string;
  toolName: string;
  description: string;
  input: Record<string, any>;
  /** Set when the tool is AskUserQuestion: render a picker, not Allow/Deny. */
  questions?: AskQuestion[];
}

/** A control_request this app sent and is waiting on. */
export type PendingControl =
  | { subtype: 'set_permission_mode'; value: PermissionMode }
  | { subtype: 'set_model'; value: string };

export interface RemoteSessionState {
  sessionId: string;
  token: string;
  title?: string;
  phase: ConnectionPhase;
  /** The CLI is working on a turn (cleared by a `result` frame). */
  isWorking: boolean;
  entries: RemoteEntry[];
  pendingPrompt?: PendingPrompt;
  pendingControls: Record<string, PendingControl>;
  permissionMode: PermissionMode;
  model?: string;
  cwd?: string;
  /** Last control error to surface to the user (e.g. unknown model). */
  notice?: string;
  /** A worker_disconnected hit mid-turn; cleared once we reconnect. */
  turnInterrupted?: boolean;
  /** True only if an actual worker_disconnected event occurred during this session. */
  hadWorkerDisconnect?: boolean;
  /** Monotonic counter for entry ids. */
  seq: number;
}

export type RelayEffect =
  | { type: 'send'; payload: Record<string, any> }
  | { type: 'vibrate' }
  | { type: 'saveReconnectToken'; token: string }
  | { type: 'close' };

export interface FrameResult {
  state: RemoteSessionState;
  effects: RelayEffect[];
}

export function createInitialState(): RemoteSessionState {
  return {
    sessionId: '',
    token: '',
    phase: 'idle',
    isWorking: false,
    entries: [],
    pendingControls: {},
    permissionMode: 'default',
    seq: 0,
  };
}

export function makeRequestId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}

function nextId(
  state: RemoteSessionState,
  prefix: string,
): [string, RemoteSessionState] {
  const seq = state.seq + 1;
  return [`${prefix}_${seq}`, { ...state, seq }];
}

export function addEntry(
  state: RemoteSessionState,
  entry: NewEntry,
): RemoteSessionState {
  const [id, next]: [string, RemoteSessionState] = entry.id
    ? [entry.id, state]
    : nextId(state, entry.kind);
  return {
    ...next,
    entries: [...next.entries, { ...entry, id } as RemoteEntry],
  };
}

export function addSystem(
  state: RemoteSessionState,
  text: string,
  tone: 'info' | 'error' = 'info',
): RemoteSessionState {
  return addEntry(state, { kind: 'system', text, tone });
}

/** Record a prompt the user sent from this device. */
export function addLocalUser(
  state: RemoteSessionState,
  text: string,
): RemoteSessionState {
  return { ...addEntry(state, { kind: 'user', text }), isWorking: true };
}

function contentToText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => (typeof c === 'string' ? c : c?.text || ''))
      .join('\n');
  }
  return content == null ? '' : JSON.stringify(content);
}

function normalizePermissionMode(mode: unknown): PermissionMode | undefined {
  return PERMISSION_MODES.some(m => m.mode === mode)
    ? (mode as PermissionMode)
    : undefined;
}

function controlError(requestId: string, error: string): RelayEffect {
  return {
    type: 'send',
    payload: {
      type: 'control_response',
      response: { subtype: 'error', request_id: requestId, error },
    },
  };
}

/** Index of the assistant entries currently being streamed, oldest first. */
function streamingIndices(entries: RemoteEntry[]): number[] {
  const out: number[] = [];
  entries.forEach((e, i) => {
    if (e.kind === 'assistant' && e.streaming) out.push(i);
  });
  return out;
}

/** Finalize any entry still mid-stream, e.g. because the connection died
 * before its closing frame arrived. Keeps whatever text had streamed in. */
function finalizeStreaming(state: RemoteSessionState): RemoteSessionState {
  return {
    ...state,
    entries: state.entries.map(e =>
      e.kind === 'assistant' && e.streaming ? { ...e, streaming: false } : e,
    ),
  };
}

export function hasRunningTool(state: RemoteSessionState): boolean {
  return state.entries.some(e => e.kind === 'tool' && e.tool.status === 'running');
}

/** How long a turn can sit idle with no running tool before we give up on it. */
export const WORKING_TIMEOUT_MS = 45000;

/**
 * Give up waiting on a turn that's gone silent too long — most often because
 * the CLI's closing `result` frame never reached us (the reply itself may
 * have rendered fine). A no-op once a tool is running, since those can
 * legitimately take a while with no frames in between. The caller (the
 * context that owns the socket) is responsible for the actual idle timer;
 * this just applies it.
 */
export function giveUpOnTurn(state: RemoteSessionState): RemoteSessionState {
  if (!state.isWorking || hasRunningTool(state)) return state;
  return addSystem(
    { ...finalizeStreaming(state), isWorking: false },
    "Didn't hear back from your laptop — send your message again if you don't see a reply.",
    'error',
  );
}

function applyAssistant(
  state: RemoteSessionState,
  data: any,
): RemoteSessionState {
  const content = data.message?.content;
  const blocks: any[] =
    typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : Array.isArray(content)
      ? content
      : [];

  let next: RemoteSessionState = data.message?.model
    ? { ...state, model: data.message.model }
    : state;

  // Final text replaces what was streamed for it, in place.
  const streamed = streamingIndices(next.entries);
  const entries = [...next.entries];
  let streamCursor = 0;
  const appended: NewEntry[] = [];

  for (const block of blocks) {
    if (block?.type === 'text') {
      const idx = streamed[streamCursor++];
      if (idx !== undefined) {
        // An empty final block (e.g. a truncated/aborted turn) should still
        // finalize the entry, keeping whatever was already streamed rather
        // than being treated as a "leftover" and dropped below.
        const prev = entries[idx] as Extract<RemoteEntry, { kind: 'assistant' }>;
        entries[idx] = {
          ...prev,
          text: block.text || prev.text,
          streaming: false,
        };
      } else if (block.text) {
        appended.push({ kind: 'assistant', text: block.text });
      }
    } else if (block?.type === 'tool_use') {
      appended.push({
        kind: 'tool',
        id: block.id,
        tool: {
          name: block.name || 'Tool',
          input: block.input || {},
          status: 'running',
        },
      });
    }
  }

  // Leftover streamed entries had no final counterpart: drop them.
  const leftovers = new Set(streamed.slice(streamCursor));
  next = { ...next, entries: entries.filter((_, i) => !leftovers.has(i)) };
  for (const entry of appended) next = addEntry(next, entry);

  const startedTool = blocks.some(b => b?.type === 'tool_use');
  const hasRunningTools = next.entries.some(
    e => e.kind === 'tool' && e.tool.status === 'running',
  );
  return {
    ...next,
    isWorking: startedTool || hasRunningTools,
  };
}

function applyUser(state: RemoteSessionState, data: any): RemoteSessionState {
  const content = data.message?.content;
  let text = '';
  let next = state;

  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text') {
        text += (text ? '\n' : '') + (block.text || '');
      } else if (block?.type === 'tool_result') {
        const toolId = block.tool_use_id;
        const output = contentToText(block.content);
        const status = block.is_error ? 'error' : 'success';
        next = {
          ...next,
          entries: next.entries.map(e =>
            e.kind === 'tool' && e.id === toolId
              ? { ...e, tool: { ...e.tool, status, output } }
              : e,
          ),
        };
      }
    }
  }

  const clean = text.trim();
  if (!clean) return next;
  // The CLI echoes prompts this device sent; don't show them twice.
  const lastUser = [...next.entries].reverse().find(e => e.kind === 'user');
  if (lastUser?.kind === 'user' && lastUser.text === clean) return next;
  return { ...addEntry(next, { kind: 'user', text: clean }), isWorking: true };
}

function applyStreamEvent(
  state: RemoteSessionState,
  data: any,
): RemoteSessionState {
  // Claude-style stream-json nests the Anthropic event under `event`.
  const ev = data.type === 'stream_event' ? data.event || {} : data;

  // Handle stream completion events to immediately clear working state
  if (
    ev.type === 'message_stop' ||
    (ev.type === 'message_delta' && ev.delta?.stop_reason)
  ) {
    const hasRunningTools = state.entries.some(
      e => e.kind === 'tool' && e.tool.status === 'running',
    );
    return {
      ...finalizeStreaming(state),
      isWorking: hasRunningTools,
    };
  }

  const startsText =
    ev.type === 'content_block_start' && ev.content_block?.type === 'text';
  // Only text deltas carry `delta.text`; thinking and tool-input deltas use other keys.
  const delta =
    ev.type === 'content_block_delta' ? ev.delta?.text || '' : data.text || '';
  if (!startsText && !delta) return state;

  const streamed = streamingIndices(state.entries);
  const last = streamed[streamed.length - 1];
  if (startsText || last === undefined) {
    return {
      ...addEntry(state, { kind: 'assistant', text: delta, streaming: true }),
      isWorking: true,
    };
  }
  const entries = [...state.entries];
  const entry = entries[last] as Extract<RemoteEntry, { kind: 'assistant' }>;
  entries[last] = { ...entry, text: entry.text + delta };
  return { ...state, entries, isWorking: true };
}

function applyControlRequest(
  state: RemoteSessionState,
  data: any,
): FrameResult {
  const requestId: string = data.request_id || data.request?.request_id || '';
  const request = data.request || {};

  if (request.subtype !== 'can_use_tool') {
    // Silence makes the CLI hang: always answer unknown subtypes.
    return {
      state,
      effects: [
        controlError(
          requestId,
          `Unsupported request subtype: ${request.subtype}`,
        ),
      ],
    };
  }

  const input = request.input || {};
  const isQuestion =
    request.tool_name === 'AskUserQuestion' && Array.isArray(input.questions);
  const pendingPrompt: PendingPrompt = {
    requestId,
    toolName: request.tool_name || 'Tool',
    description: request.description || '',
    input,
    questions: isQuestion ? input.questions : undefined,
  };
  return { state: { ...state, pendingPrompt }, effects: [{ type: 'vibrate' }] };
}

function applyControlResponse(
  state: RemoteSessionState,
  data: any,
): RemoteSessionState {
  const response = data.response || {};
  const requestId: string = response.request_id;
  const pending = state.pendingControls[requestId];
  if (!pending) return state;

  const rest = { ...state.pendingControls };
  delete rest[requestId];
  let next: RemoteSessionState = { ...state, pendingControls: rest };

  if (response.subtype === 'error') {
    return {
      ...next,
      notice: response.error || `Could not apply ${pending.subtype}`,
    };
  }
  if (pending.subtype === 'set_permission_mode') {
    const mode =
      normalizePermissionMode(response.response?.mode) ?? pending.value;
    next = { ...next, permissionMode: mode, notice: undefined };
  } else {
    // set_model success carries no body by design: apply what we asked for.
    next = { ...next, model: pending.value, notice: undefined };
  }
  return next;
}

/** Apply one frame received from the relay. */
export function applyFrame(state: RemoteSessionState, data: any): FrameResult {
  if (!data || typeof data !== 'object') return { state, effects: [] };

  switch (data.type) {
    case 'system':
      switch (data.subtype) {
        case 'reconnect_token':
          return data.token
            ? {
                state,
                effects: [{ type: 'saveReconnectToken', token: data.token }],
              }
            : { state, effects: [] };
        case 'init':
          return {
            state: {
              ...state,
              phase: 'attached',
              model: data.model || state.model,
              cwd: data.cwd || state.cwd,
              permissionMode:
                normalizePermissionMode(data.permissionMode) ??
                state.permissionMode,
            },
            effects: [],
          };
        case 'compact_boundary':
          return {
            state: addSystem(state, 'Conversation compacted'),
            effects: [],
          };
        case 'status': {
          const status =
            typeof data.status === 'string' ? data.status.trim() : '';
          if (status === 'idle' || status === 'ready') {
            return {
              state: { ...finalizeStreaming(state), isWorking: false },
              effects: [],
            };
          }
          if (!status) return { state, effects: [] };
          return { state: addSystem(state, status), effects: [] };
        }
        default:
          return { state, effects: [] };
      }

    case 'worker_connected': {
      const wasDetached =
        Boolean(state.hadWorkerDisconnect) && state.entries.length > 0;
      const next: RemoteSessionState = {
        ...state,
        phase: 'attached' as const,
        turnInterrupted: false,
        hadWorkerDisconnect: false,
      };
      if (!wasDetached) return { state: next, effects: [] };
      // A turn was in flight when the CLI dropped: the reply may never have
      // reached us, so say so instead of silently looking idle.
      const message = state.turnInterrupted
        ? "Reconnected to your laptop. Puku's reply may not have come through — send your last message again if you don't see it."
        : 'Reconnected to your laptop';
      return { state: addSystem(next, message), effects: [] };
    }

    case 'worker_disconnected': {
      // Finalize any in-flight streamed reply: it won't be completed over
      // this connection, and leaving it `streaming` would make a later
      // turn's final text wrongly match onto this stale, already-shown entry
      // instead of its own (the matcher pairs final blocks to the oldest
      // still-streaming entry, in order).
      return {
        state: addSystem(
          {
            ...finalizeStreaming(state),
            phase: 'open',
            isWorking: false,
            turnInterrupted: state.turnInterrupted || state.isWorking,
            hadWorkerDisconnect: true,
          },
          'Laptop CLI disconnected. Waiting for it to come back…',
        ),
        effects: [],
      };
    }

    case 'client_replaced':
      return {
        state: addSystem(
          {
            ...state,
            phase: 'closed',
            isWorking: false,
            pendingPrompt: undefined,
          },
          'Another device took over this session.',
        ),
        effects: [{ type: 'close' }],
      };

    case 'session_end':
      return {
        state: addSystem(
          {
            ...state,
            phase: 'closed',
            isWorking: false,
            pendingPrompt: undefined,
          },
          'The session ended on your laptop.',
        ),
        effects: [{ type: 'close' }],
      };

    case 'control_request':
      return applyControlRequest(state, data);

    case 'control_cancel_request':
      return {
        state:
          state.pendingPrompt?.requestId === data.request_id
            ? { ...state, pendingPrompt: undefined }
            : state,
        effects: [],
      };

    case 'control_response':
      return { state: applyControlResponse(state, data), effects: [] };

    case 'user':
      return { state: applyUser(state, data), effects: [] };

    case 'assistant':
      return { state: applyAssistant(state, data), effects: [] };

    case 'stream_event':
    case 'content_block_delta':
      return { state: applyStreamEvent(state, data), effects: [] };

    case 'result': {
      const failed =
        data.is_error || (data.subtype && data.subtype !== 'success');
      // Tools still "running" when the turn ends never reported back.
      const entries = state.entries.map(e =>
        e.kind === 'tool' && e.tool.status === 'running'
          ? {
              ...e,
              tool: {
                ...e.tool,
                status: failed ? ('error' as const) : ('success' as const),
              },
            }
          : e.kind === 'assistant' && e.streaming
          ? { ...e, streaming: false }
          : e,
      );
      let next: RemoteSessionState = {
        ...state,
        entries,
        isWorking: false,
        pendingPrompt: undefined,
      };
      if (failed) {
        next = addSystem(
          next,
          `Run ended: ${data.subtype || 'error'}`,
          'error',
        );
      }
      return { state: next, effects: [] };
    }

    default:
      if (typeof data.log === 'string' && data.log.trim()) {
        return { state: addSystem(state, data.log.trim()), effects: [] };
      }
      return { state, effects: [] };
  }
}

/** Split a raw WebSocket message into frames (one JSON object, or NDJSON). */
export function parseMessage(raw: string): { frames: any[]; text: string[] } {
  const trimmed = raw.trim();
  if (!trimmed) return { frames: [], text: [] };
  try {
    return { frames: [JSON.parse(trimmed)], text: [] };
  } catch {
    const frames: any[] = [];
    const text: string[] = [];
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        frames.push(JSON.parse(l));
      } catch {
        if (!l.startsWith('{') && !l.startsWith('[') && !l.startsWith('"'))
          text.push(line);
      }
    }
    return { frames, text };
  }
}

// ---- Outgoing frames -------------------------------------------------------

export function userFrame(text: string, sessionId: string) {
  return {
    type: 'user',
    message: { role: 'user', content: text },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}

export function interruptFrame() {
  return {
    type: 'control_request',
    request_id: makeRequestId(),
    request: { subtype: 'interrupt' },
  };
}

export function permissionReply(
  requestId: string,
  allow: boolean,
  message?: string,
) {
  return {
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: requestId,
      response: allow
        ? { behavior: 'allow', decisionClassification: 'user_temporary' }
        : {
            behavior: 'deny',
            decisionClassification: 'user_reject',
            message: message || 'Denied from the Puku mobile app.',
          },
    },
  };
}

/** Reply to AskUserQuestion. Multi-select answers join with ", " (wire format). */
export function questionReply(
  prompt: PendingPrompt,
  answers: Record<string, string[]> | null,
  denyMessage?: string,
) {
  if (!answers) {
    return {
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: prompt.requestId,
        response: {
          behavior: 'deny',
          message: denyMessage || 'Let me clarify before you proceed.',
        },
      },
    };
  }
  const joined: Record<string, string> = {};
  for (const q of prompt.questions || []) {
    joined[q.question] = (answers[q.question] || []).join(', ');
  }
  return {
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: prompt.requestId,
      response: {
        behavior: 'allow',
        updatedInput: { questions: prompt.questions, answers: joined },
      },
    },
  };
}

export function controlFrame(
  requestId: string,
  control: PendingControl,
): Record<string, any> {
  return control.subtype === 'set_permission_mode'
    ? {
        type: 'control_request',
        request_id: requestId,
        request: { subtype: control.subtype, mode: control.value },
      }
    : {
        type: 'control_request',
        request_id: requestId,
        request: { subtype: control.subtype, model: control.value },
      };
}

/** Close codes per the guide: 1000 = clean, 4xxx = session gone. Anything else retries. */
export function shouldReconnect(code: number | undefined): boolean {
  if (code === 1000) return false;
  if (code !== undefined && code >= 4000 && code < 5000) return false;
  return true;
}

export const RECONNECT_DELAYS_MS = [3000, 6000, 12000, 30000];
export const MAX_RECONNECT_ATTEMPTS = 20;

export function reconnectDelay(attempt: number): number {
  return RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
}
