import {
  RemoteSessionState,
  addLocalUser,
  applyFrame,
  controlFrame,
  createInitialState,
  giveUpOnTurn,
  hasRunningTool,
  parseMessage,
  permissionReply,
  questionReply,
  reconnectDelay,
  shouldReconnect,
} from '../src/features/remote_session/relay/protocol';
import {
  buildFeed,
  describeTool,
  summarizeTools,
} from '../src/features/remote_session/relay/feed';

/** Apply frames in order, collecting every effect. */
function run(frames: any[], start: RemoteSessionState = createInitialState()) {
  let state = start;
  const effects: any[] = [];
  for (const frame of frames) {
    const result = applyFrame(state, frame);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const delta = (text: string) => ({
  type: 'stream_event',
  event: {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text },
  },
});

describe('connection lifecycle', () => {
  test('input is only enabled once the CLI attaches', () => {
    const opened = { ...createInitialState(), phase: 'open' as const };
    expect(
      run(
        [{ type: 'system', subtype: 'reconnect_token', token: 'rt1' }],
        opened,
      ).state.phase,
    ).toBe('open');
    expect(run([{ type: 'worker_connected' }], opened).state.phase).toBe(
      'attached',
    );
    expect(
      run(
        [
          {
            type: 'system',
            subtype: 'init',
            model: 'puku-ai-2.8',
            cwd: '/repo',
            permissionMode: 'plan',
          },
        ],
        opened,
      ).state,
    ).toMatchObject({
      phase: 'attached',
      model: 'puku-ai-2.8',
      cwd: '/repo',
      permissionMode: 'plan',
    });
  });

  test('reconnect_token is handed to the caller to persist', () => {
    const { effects } = run([
      { type: 'system', subtype: 'reconnect_token', token: 'rt1' },
    ]);
    expect(effects).toEqual([{ type: 'saveReconnectToken', token: 'rt1' }]);
  });

  test('worker_disconnected keeps the socket but disables input', () => {
    const attached = { ...createInitialState(), phase: 'attached' as const };
    const { state, effects } = run([{ type: 'worker_disconnected' }], attached);
    expect(state.phase).toBe('open');
    expect(effects).toEqual([]);
  });

  test('worker_disconnected finalizes an in-flight streamed reply so a later turn cannot land on it', () => {
    const streaming = run([
      {
        type: 'stream_event',
        event: { type: 'content_block_start', content_block: { type: 'text' } },
      },
      delta('partial'),
    ]);
    expect(streaming.state.entries).toEqual([
      expect.objectContaining({ text: 'partial', streaming: true }),
    ]);

    const dropped = run([{ type: 'worker_disconnected' }], streaming.state);
    const assistantAfterDrop = dropped.state.entries.filter(
      e => e.kind === 'assistant',
    );
    expect(assistantAfterDrop).toEqual([
      expect.objectContaining({ text: 'partial', streaming: false }),
    ]);

    // Reconnect, then a fresh turn streams and finishes: its final text must
    // land on its own new entry, not get matched onto the stale one above.
    const reconnected = run([{ type: 'worker_connected' }], dropped.state);
    const nextTurn = run(
      [
        {
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            content_block: { type: 'text' },
          },
        },
        delta('new reply'),
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'new reply' }] },
        },
      ],
      reconnected.state,
    );
    const assistantAfterNextTurn = nextTurn.state.entries.filter(
      e => e.kind === 'assistant',
    );
    expect(assistantAfterNextTurn).toEqual([
      expect.objectContaining({ text: 'partial', streaming: false }),
      expect.objectContaining({ text: 'new reply', streaming: false }),
    ]);
  });

  test('reconnecting after a mid-turn drop tells the user the reply may be missing', () => {
    const working = {
      ...createInitialState(),
      phase: 'attached' as const,
      isWorking: true,
    };
    const dropped = run([{ type: 'worker_disconnected' }], working);
    expect(dropped.state.turnInterrupted).toBe(true);

    const reconnected = run([{ type: 'worker_connected' }], dropped.state);
    const last = reconnected.state.entries[reconnected.state.entries.length - 1];
    expect(last).toMatchObject({
      kind: 'system',
      text: expect.stringContaining('may not have come through'),
    });
    expect(reconnected.state.turnInterrupted).toBe(false);
  });

  test('reconnecting after an idle drop (no turn in flight) keeps the plain message', () => {
    const attached = { ...createInitialState(), phase: 'attached' as const };
    const dropped = run([{ type: 'worker_disconnected' }], attached);
    expect(dropped.state.turnInterrupted).toBe(false);

    const reconnected = run([{ type: 'worker_connected' }], dropped.state);
    const last = reconnected.state.entries[reconnected.state.entries.length - 1];
    expect(last).toMatchObject({
      kind: 'system',
      text: 'Reconnected to your laptop',
    });
  });

  test.each(['client_replaced', 'session_end'])(
    '%s closes the session',
    type => {
      const { state, effects } = run([{ type }], {
        ...createInitialState(),
        phase: 'attached',
      });
      expect(state.phase).toBe('closed');
      expect(effects).toContainEqual({ type: 'close' });
    },
  );

  test('close codes: 1000 and 4xxx stop, network drops retry with backoff', () => {
    expect(shouldReconnect(1000)).toBe(false);
    expect(shouldReconnect(4001)).toBe(false);
    expect(shouldReconnect(1006)).toBe(true);
    expect(shouldReconnect(1011)).toBe(true);
    expect([0, 1, 2, 3, 9].map(reconnectDelay)).toEqual([
      3000, 6000, 12000, 30000, 30000,
    ]);
  });
});

describe('giveUpOnTurn (idle-turn watchdog)', () => {
  test('clears a stuck isWorking and finalizes any streamed text, with an explanatory message', () => {
    const live = run([
      {
        type: 'stream_event',
        event: { type: 'content_block_start', content_block: { type: 'text' } },
      },
      delta('partial'),
    ]);
    expect(live.state.isWorking).toBe(true);

    const gaveUp = giveUpOnTurn(live.state);
    expect(gaveUp.isWorking).toBe(false);
    expect(gaveUp.entries).toContainEqual(
      expect.objectContaining({ text: 'partial', streaming: false }),
    );
    expect(gaveUp.entries[gaveUp.entries.length - 1]).toMatchObject({
      kind: 'system',
      tone: 'error',
      text: expect.stringContaining("send your message again"),
    });
  });

  test('is a no-op while a tool is still running, or when not working', () => {
    const notWorking = createInitialState();
    expect(giveUpOnTurn(notWorking)).toBe(notWorking);

    const withRunningTool = run([
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'call_a', name: 'Bash', input: { command: 'sleep 60' } },
          ],
        },
      },
    ]).state;
    expect(hasRunningTool(withRunningTool)).toBe(true);
    expect(giveUpOnTurn(withRunningTool)).toBe(withRunningTool);
  });
});

describe('streaming output', () => {
  test('stream_event deltas show live, then the final assistant frame replaces them', () => {
    const live = run([
      {
        type: 'stream_event',
        event: { type: 'content_block_start', content_block: { type: 'text' } },
      },
      delta('Hel'),
      delta('lo'),
    ]);
    expect(live.state.entries).toEqual([
      expect.objectContaining({
        kind: 'assistant',
        text: 'Hello',
        streaming: true,
      }),
    ]);

    const done = run(
      [
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Hello!' }] },
        },
      ],
      live.state,
    );
    expect(done.state.entries).toEqual([
      expect.objectContaining({
        kind: 'assistant',
        text: 'Hello!',
        streaming: false,
      }),
    ]);
  });

  test('thinking and tool-input deltas are not rendered as text', () => {
    const { state } = run([
      {
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'thinking_delta', thinking: 'hmm' },
        },
      },
      {
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'input_json_delta', partial_json: '{' },
        },
      },
    ]);
    expect(state.entries).toEqual([]);
  });

  test('without streaming, assistant frames append as before', () => {
    const { state } = run([
      { type: 'assistant', message: { content: 'one' } },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'two' }] },
      },
    ]);
    expect(state.entries.map(e => (e as any).text)).toEqual(['one', 'two']);
  });
});

describe('tool calls', () => {
  test('results attach to their tool_use by id, including failures', () => {
    const { state } = run([
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'call_a',
              name: 'Bash',
              input: { command: 'ls' },
            },
            {
              type: 'tool_use',
              id: 'call_b',
              name: 'Bash',
              input: { command: 'false' },
            },
          ],
        },
      },
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call_b',
              content: 'exit 1',
              is_error: true,
            },
            {
              type: 'tool_result',
              tool_use_id: 'call_a',
              content: [{ type: 'text', text: 'a.txt' }],
            },
          ],
        },
      },
    ]);
    const tools = state.entries.filter(e => e.kind === 'tool') as any[];
    expect(tools.map(t => [t.id, t.tool.status, t.tool.output])).toEqual([
      ['call_a', 'success', 'a.txt'],
      ['call_b', 'error', 'exit 1'],
    ]);
  });

  test('result frame ends the turn and settles tools that never reported', () => {
    const { state } = run([
      {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }],
        },
      },
      { type: 'result', subtype: 'success' },
    ]);
    expect(state.isWorking).toBe(false);
    expect((state.entries[0] as any).tool.status).toBe('success');
  });
});

describe('user echo', () => {
  test('a prompt sent from this device is not shown twice when the CLI echoes it', () => {
    const local = addLocalUser(createInitialState(), 'git status');
    const { state } = run(
      [{ type: 'user', message: { content: 'git status' } }],
      local,
    );
    expect(state.entries.filter(e => e.kind === 'user')).toHaveLength(1);
  });

  test('a prompt typed on the laptop does show up', () => {
    const { state } = run([
      { type: 'user', message: { content: 'typed on laptop' } },
    ]);
    expect(state.entries).toEqual([
      expect.objectContaining({ kind: 'user', text: 'typed on laptop' }),
    ]);
  });
});

describe('control requests', () => {
  const canUseTool = {
    type: 'control_request',
    request_id: 'req-1',
    request: {
      subtype: 'can_use_tool',
      tool_name: 'Bash',
      input: { command: 'rm -rf build' },
      description: 'Run',
    },
  };

  test('can_use_tool opens a prompt and vibrates', () => {
    const { state, effects } = run([canUseTool]);
    expect(state.pendingPrompt).toMatchObject({
      requestId: 'req-1',
      toolName: 'Bash',
    });
    expect(effects).toEqual([{ type: 'vibrate' }]);
  });

  test('control_cancel_request dismisses the matching prompt only', () => {
    const other = run([
      canUseTool,
      { type: 'control_cancel_request', request_id: 'req-2' },
    ]);
    expect(other.state.pendingPrompt).toBeDefined();
    const same = run([
      canUseTool,
      { type: 'control_cancel_request', request_id: 'req-1' },
    ]);
    expect(same.state.pendingPrompt).toBeUndefined();
  });

  test('unknown subtypes get an error reply so the CLI does not hang', () => {
    const { effects } = run([
      {
        type: 'control_request',
        request_id: 'r9',
        request: { subtype: 'mystery' },
      },
    ]);
    expect(effects).toEqual([
      {
        type: 'send',
        payload: {
          type: 'control_response',
          response: {
            subtype: 'error',
            request_id: 'r9',
            error: 'Unsupported request subtype: mystery',
          },
        },
      },
    ]);
  });

  test('allow and deny replies echo the outer request id', () => {
    expect(permissionReply('req-1', true).response).toEqual({
      subtype: 'success',
      request_id: 'req-1',
      response: { behavior: 'allow', decisionClassification: 'user_temporary' },
    });
    expect(permissionReply('req-1', false).response.response).toMatchObject({
      behavior: 'deny',
      decisionClassification: 'user_reject',
    });
  });

  test('AskUserQuestion renders as a picker and joins multi-select answers', () => {
    const questions = [
      {
        question: 'Target?',
        options: [{ label: 'Staging' }, { label: 'Production' }],
      },
      {
        question: 'Checks?',
        multiSelect: true,
        options: [{ label: 'Lint' }, { label: 'Tests' }],
      },
    ];
    const { state } = run([
      {
        type: 'control_request',
        request_id: 'req-q',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'AskUserQuestion',
          input: { questions },
        },
      },
    ]);
    expect(state.pendingPrompt?.questions).toHaveLength(2);

    const reply = questionReply(state.pendingPrompt!, {
      'Target?': ['Staging'],
      'Checks?': ['Lint', 'Tests'],
    });
    expect(reply.response.response).toEqual({
      behavior: 'allow',
      updatedInput: {
        questions,
        answers: { 'Target?': 'Staging', 'Checks?': 'Lint, Tests' },
      },
    });
    expect(
      questionReply(state.pendingPrompt!, null).response.response.behavior,
    ).toBe('deny');
  });

  test('set_model success applies the pending value; errors surface as a notice', () => {
    const pending = {
      ...createInitialState(),
      pendingControls: {
        m1: { subtype: 'set_model' as const, value: 'puku-ai-2.8' },
      },
    };
    expect(controlFrame('m1', pending.pendingControls.m1)).toEqual({
      type: 'control_request',
      request_id: 'm1',
      request: { subtype: 'set_model', model: 'puku-ai-2.8' },
    });

    const ok = run(
      [
        {
          type: 'control_response',
          response: { subtype: 'success', request_id: 'm1' },
        },
      ],
      pending,
    );
    expect(ok.state.model).toBe('puku-ai-2.8');
    expect(ok.state.pendingControls).toEqual({});

    const bad = run(
      [
        {
          type: 'control_response',
          response: {
            subtype: 'error',
            request_id: 'm1',
            error: 'Unknown model',
          },
        },
      ],
      pending,
    );
    expect(bad.state.model).toBeUndefined();
    expect(bad.state.notice).toBe('Unknown model');
  });
});

describe('parseMessage', () => {
  test('accepts a single JSON frame, NDJSON, and plain text lines', () => {
    expect(parseMessage('{"type":"a"}').frames).toEqual([{ type: 'a' }]);
    expect(parseMessage('{"type":"a"}\n{"type":"b"}').frames).toEqual([
      { type: 'a' },
      { type: 'b' },
    ]);
    expect(parseMessage('{"type":"a"}\nhello').text).toEqual(['hello']);
  });
});

describe('feed', () => {
  const tool = (id: string, name: string, input: any = {}) => ({
    kind: 'tool' as const,
    id,
    tool: { name, input, status: 'success' as const },
  });

  test('consecutive tool calls group; other entries break the run', () => {
    const feed = buildFeed([
      tool('a', 'Bash'),
      tool('b', 'Bash'),
      { kind: 'assistant', id: 'x', text: 'done' },
      tool('c', 'Read'),
    ]);
    expect(
      feed.map(f => (f.kind === 'tools' ? f.tools.length : f.kind)),
    ).toEqual([2, 'assistant', 1]);
  });

  test('summaries read like Claude Code', () => {
    expect(
      summarizeTools([tool('a', 'Bash').tool, tool('b', 'Bash').tool]),
    ).toBe('Ran 2 commands');
    expect(summarizeTools([tool('a', 'Read').tool])).toBe('Read a file');
    expect(
      summarizeTools([tool('a', 'Bash').tool, tool('b', 'Read').tool]),
    ).toBe('Used 2 tools');
    expect(
      describeTool(tool('a', 'Read', { file_path: '/src/app/main.ts' }).tool),
    ).toBe('Read main.ts');
    expect(describeTool(tool('a', 'Bash', { command: 'npm test' }).tool)).toBe(
      'npm test',
    );
  });
});

describe('turn completion & working state', () => {
  test('conversational assistant frame resets isWorking to false when no tools are running', () => {
    const working = {
      ...createInitialState(),
      phase: 'attached' as const,
      isWorking: true,
    };
    const { state } = run(
      [
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Here is the answer to your question.' }],
          },
        },
      ],
      working,
    );
    expect(state.isWorking).toBe(false);
    expect(state.entries).toEqual([
      expect.objectContaining({
        kind: 'assistant',
        text: 'Here is the answer to your question.',
      }),
    ]);
  });

  test('stream completion event resets isWorking to false', () => {
    const streaming = run([
      {
        type: 'stream_event',
        event: { type: 'content_block_start', content_block: { type: 'text' } },
      },
      delta('Thinking complete. Here is the response.'),
    ]);
    expect(streaming.state.isWorking).toBe(true);

    const done = run(
      [
        {
          type: 'stream_event',
          event: { type: 'message_stop' },
        },
      ],
      streaming.state,
    );
    expect(done.state.isWorking).toBe(false);
    expect(done.state.entries[0]).toMatchObject({
      streaming: false,
      text: 'Thinking complete. Here is the response.',
    });
  });

  test('system status idle resets isWorking to false', () => {
    const working = {
      ...createInitialState(),
      phase: 'attached' as const,
      isWorking: true,
    };
    const { state } = run(
      [{ type: 'system', subtype: 'status', status: 'idle' }],
      working,
    );
    expect(state.isWorking).toBe(false);
  });

  test('initial connection with pre-existing entries does not show spurious reconnected pill', () => {
    const sessionWithHistory: RemoteSessionState = {
      ...createInitialState(),
      phase: 'open',
      entries: [
        { kind: 'user', id: 'u1', text: 'hello' },
        { kind: 'assistant', id: 'a1', text: 'Hi! Here is your project.' },
      ],
      hadWorkerDisconnect: false,
    };

    const connected = run([{ type: 'worker_connected' }], sessionWithHistory);
    expect(connected.state.phase).toBe('attached');
    // Ensure no 'Reconnected to your laptop' system pill was injected
    const systemEntries = connected.state.entries.filter(e => e.kind === 'system');
    expect(systemEntries).toHaveLength(0);
  });
});

