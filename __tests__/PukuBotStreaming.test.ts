import AsyncStorage from '@react-native-async-storage/async-storage';
import { PukuBotApiClient, createSseParser, SseMessage } from '../src/services/pukuBotApi';
import { PukuBotTurnEvent } from '../src/types';

/** XHR double that lets a test drive progress, completion and failures. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: any;
  status = 0;
  responseText = '';
  aborted = false;
  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(body?: any) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
  }
  /** Delivers more of the response body. */
  progress(chunk: string, status = 200) {
    this.status = status;
    this.responseText += chunk;
    this.onprogress?.();
  }
  finish(status = 200, extra = '') {
    this.status = status;
    this.responseText += extra;
    this.onload?.();
  }
  fail() {
    this.onerror?.();
  }
}

const sse = (id: string, data: object) => `id: ${id}\nevent: ${(data as any).type}\ndata: ${JSON.stringify(data)}\n\n`;
const flush = () => new Promise<void>(r => setImmediate(() => r()));

describe('createSseParser', () => {
  test('emits only complete events, across arbitrary chunk boundaries', () => {
    const got: SseMessage[] = [];
    const parser = createSseParser(m => got.push(m));
    const stream =
      ': comment\r\n\r\n' +
      'id: 1\r\nevent: message.delta\r\ndata: {"delta":"Hel"}\r\n\r\n' +
      'id: 2\ndata: {"type":"message.delta",\ndata: "delta":"lo"}\n\n';
    // Feed one character at a time: a CRLF and every field get split.
    for (const ch of stream) parser.push(ch);

    expect(got).toEqual([
      { id: '1', event: 'message.delta', data: '{"delta":"Hel"}' },
      { id: '2', event: undefined, data: '{"type":"message.delta",\n"delta":"lo"}' },
    ]);
  });

  test('flush emits a trailing event without the blank line', () => {
    const got: SseMessage[] = [];
    const parser = createSseParser(m => got.push(m));
    parser.push('data: {"type":"turn.completed"}');
    expect(got).toHaveLength(0);
    parser.flush();
    expect(got).toEqual([{ id: undefined, event: undefined, data: '{"type":"turn.completed"}' }]);
  });
});

describe('Puku Bot reply streaming', () => {
  let client: PukuBotApiClient;

  beforeEach(async () => {
    jest.useRealTimers();
    FakeXhr.instances = [];
    (globalThis as any).XMLHttpRequest = FakeXhr;
    await AsyncStorage.clear();
    client = PukuBotApiClient.getInstance();
    await client.init();
    await client.setToken('tok_stream');
    (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
  });

  test('streams a reply and sends the message body the spec expects', () => {
    const events: PukuBotTurnEvent[] = [];
    client.sendMessageStream(
      'channel_1',
      'Summarise this',
      [{ id: 'att_1', name: 'notes.md', mimeType: 'text/markdown' } as any],
      e => events.push(e),
      { skills: ['summarize'] }
    );
    const xhr = FakeXhr.instances[0];
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toMatch(/\/conversations\/channel_1\/messages$/);
    expect(xhr.headers.Accept).toBe('text/event-stream');
    expect(xhr.headers.Authorization).toBe('Bearer tok_stream');
    expect(JSON.parse(xhr.body)).toEqual({
      text: 'Summarise this',
      attachments: [{ id: 'att_1', name: 'notes.md', mimeType: 'text/markdown' }],
      skills: ['summarize'],
    });

    xhr.progress(sse('e1', { type: 'message.delta', delta: 'Hi' }));
    xhr.progress(': ping\n\n' + sse('e2', { type: 'turn.completed' }));
    xhr.finish();

    expect(events.map(e => e.type)).toEqual(['message.delta', 'turn.completed']);
    expect(events[0].eventId).toBe('e1');
  });

  test('a dropped stream resumes from the last event id, without replaying', async () => {
    const events: PukuBotTurnEvent[] = [];
    client.sendMessageStream('channel_1', 'Go', [], e => events.push(e));
    const first = FakeXhr.instances[0];
    first.progress(sse('e1', { type: 'message.delta', delta: 'Part one. ' }));
    first.fail(); // network loss

    await new Promise<void>(r => setTimeout(r, 1100));
    const resumed = FakeXhr.instances[1];
    expect(resumed.method).toBe('GET');
    expect(resumed.url).toMatch(/\/conversations\/channel_1\/events\?from=e1$/);
    expect(resumed.headers['Last-Event-ID']).toBe('e1');

    resumed.progress(sse('e2', { type: 'message.delta', delta: 'Part two.' }) + sse('e3', { type: 'turn.completed' }));
    resumed.finish();

    expect(events.map(e => e.delta || e.type)).toEqual(['Part one. ', 'Part two.', 'turn.completed']);
  });

  test('a stream that ends early is resumed instead of being treated as done', async () => {
    const events: PukuBotTurnEvent[] = [];
    client.sendMessageStream('channel_1', 'Go', [], e => events.push(e));
    FakeXhr.instances[0].progress(sse('e1', { type: 'tool.started', toolCallId: 't1', name: 'computer_navigate' }));
    FakeXhr.instances[0].finish(200);

    await new Promise<void>(r => setTimeout(r, 1100));
    expect(FakeXhr.instances[1].headers['Last-Event-ID']).toBe('e1');
    expect(events.some(e => e.type === 'turn.completed' || e.type === 'turn.failed')).toBe(false);
  });

  test('resume answering with JSON (reply on another server) falls back to polling', async () => {
    const events: PukuBotTurnEvent[] = [];
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: 'm9', role: 'assistant', text: 'Done.' }], hasMore: false, answering: false }),
      });
    client.resumeEventsStream('channel_1', e => events.push(e), 'e7');
    const xhr = FakeXhr.instances[0];
    expect(xhr.headers['Last-Event-ID']).toBe('e7');
    xhr.finish(200, JSON.stringify({ answering: true, turn: null }));

    await new Promise<void>(r => setTimeout(r, 1700));
    await flush();
    expect(events).toEqual([
      { type: 'message.completed', messageId: 'm9', text: 'Done.' },
      { type: 'turn.completed' },
    ]);
  });

  test('an HTTP error becomes one readable turn.failed', () => {
    const events: PukuBotTurnEvent[] = [];
    client.sendMessageStream('channel_1', 'Go', [], e => events.push(e));
    FakeXhr.instances[0].finish(409, JSON.stringify({ error: 'This conversation is already answering. Wait for it, or stop it.' }));
    expect(events).toEqual([
      { type: 'turn.failed', code: 'busy', message: 'This conversation is already answering. Wait for it, or stop it.' },
    ]);
  });

  test('detach stops listening but leaves the reply running; abort also stops it', async () => {
    const handle = client.sendMessageStream('channel_1', 'Go', [], () => {});
    handle.detach();
    expect(FakeXhr.instances[0].aborted).toBe(true);
    expect((globalThis as any).fetch).not.toHaveBeenCalled();

    const handle2 = client.sendMessageStream('channel_2', 'Go', [], () => {});
    handle2.abort();
    await flush();
    const [stopUrl, stopInit] = (globalThis as any).fetch.mock.calls[0];
    expect(stopUrl).toMatch(/\/conversations\/channel_2\/stop$/);
    expect(stopInit.method).toBe('POST');
  });
});

describe('Live inbox (GET /events)', () => {
  let client: PukuBotApiClient;

  beforeEach(async () => {
    jest.useFakeTimers();
    FakeXhr.instances = [];
    (globalThis as any).XMLHttpRequest = FakeXhr;
    client = PukuBotApiClient.getInstance();
    await client.setToken('tok_inbox');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('reconnects with backoff and Last-Event-ID until aborted', () => {
    const events: any[] = [];
    const statuses: string[] = [];
    const sub = client.subscribeLiveInbox(e => events.push(e), s => statuses.push(s));

    const first = FakeXhr.instances[0];
    expect(first.url).toMatch(/\/events$/);
    first.progress(`id: 41\nevent: conversation.updated\ndata: {"conversationId":"c1"}\n\n`);
    expect(events).toEqual([{ conversationId: 'c1', type: 'conversation.updated' }]);

    first.fail();
    expect(statuses).toEqual(['reconnecting']);
    jest.advanceTimersByTime(1000);
    const second = FakeXhr.instances[1];
    expect(second.headers['Last-Event-ID']).toBe('41');

    // Back-to-back failures back off: 2s for the second.
    second.finish(200);
    jest.advanceTimersByTime(1999);
    expect(FakeXhr.instances).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(FakeXhr.instances).toHaveLength(3);

    sub.abort();
    expect(FakeXhr.instances[2].aborted).toBe(true);
    FakeXhr.instances[2].fail();
    jest.advanceTimersByTime(60000);
    expect(FakeXhr.instances).toHaveLength(3);
  });
  test('on a server without /events, listens to the web feed over a WebSocket instead', () => {
    const sockets: any[] = [];
    const RealWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = function (this: any, url: string, protocols: any, options: any) {
      Object.assign(this, { url, options, close: jest.fn() });
      sockets.push(this);
    };
    try {
      const events: any[] = [];
      const statuses: string[] = [];
      const sub = client.subscribeLiveInbox(e => events.push(e), s => statuses.push(s));
      FakeXhr.instances[0].finish(404);

      expect(sockets).toHaveLength(1);
      expect(sockets[0].url).toBe(`${client.getWebOrigin().replace(/^http/, 'ws')}/api/channels/events`);
      expect(sockets[0].options.headers.Authorization).toBe('Bearer tok_inbox');
      sockets[0].onmessage({ data: '{"type":"channel.activity"}' });
      expect(events).toEqual([{ type: 'resync' }]);

      // It reconnects with backoff when the socket closes, and stops when aborted.
      sockets[0].onclose();
      expect(statuses).toEqual(['reconnecting']);
      jest.advanceTimersByTime(1000);
      expect(sockets).toHaveLength(2);
      sub.abort();
      expect(sockets[1].close).toHaveBeenCalled();
      expect(FakeXhr.instances).toHaveLength(1);
    } finally {
      (globalThis as any).WebSocket = RealWebSocket;
    }
  });

  test('stops quietly on a deployment without live updates (503)', () => {
    const statuses: string[] = [];
    client.subscribeLiveInbox(() => {}, s => statuses.push(s));
    FakeXhr.instances[0].finish(503);
    jest.advanceTimersByTime(60000);
    expect(FakeXhr.instances).toHaveLength(1);
    expect(statuses).toEqual(['closed']);
  });
});
