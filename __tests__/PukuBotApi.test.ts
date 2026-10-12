import AsyncStorage from '@react-native-async-storage/async-storage';
import { PukuBotApiClient } from '../src/services/pukuBotApi';
import { generatePkcePair, sha256, toBase64Url } from '../src/utils/auth';

class MockXMLHttpRequest {
  public open = jest.fn();
  public setRequestHeader = jest.fn();
  public send = jest.fn();
  public abort = jest.fn();
  public onprogress: (() => void) | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public status = 200;
  public responseText = '';
}

describe('PukuBot API (v1) Client & PKCE Flow', () => {
  let client: PukuBotApiClient;

  beforeEach(async () => {
    (globalThis as any).XMLHttpRequest = MockXMLHttpRequest;
    await AsyncStorage.clear();
    client = PukuBotApiClient.getInstance();
    await client.init();
    (client as any).v1Resources = null;
    jest.clearAllMocks();
  });

  test('generates valid PKCE code verifier and SHA-256 challenge', () => {
    const { verifier, challenge } = generatePkcePair();

    expect(verifier).toBeDefined();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);

    expect(challenge).toBeDefined();
    expect(challenge.length).toBe(43); // 32 bytes base64url has length 43 without padding
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toContain('=');

    // Verify determinism: sha256(verifier) matches challenge
    const manualChallenge = toBase64Url(sha256(verifier));
    expect(manualChallenge).toBe(challenge);
  });

  test('state and verifier use only base64url characters', () => {
    // The Puku Bot server answers "Invalid mobile sign-in request." to a
    // state containing '.' or '~'.
    for (let i = 0; i < 200; i++) {
      const { verifier, state } = generatePkcePair();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  test('sets and persists base URL properly', async () => {
    const customUrl = 'http://localhost:3001/api/v1';
    await client.setBaseUrl(customUrl);

    expect(client.getBaseUrl()).toBe(customUrl);

    const saved = await AsyncStorage.getItem('@pukubot_base_url');
    expect(saved).toBe(customUrl);
  });

  test('manages authentication state correctly', async () => {
    expect(client.isAuthenticated()).toBe(false);
    expect(client.getToken()).toBeNull();
    expect(client.getUser()).toBeNull();

    // Mock sign in data
    const mockToken = 'mock-bearer-token-123';
    const mockUser = {
      id: 'usr_abc',
      email: 'dev@puku.sh',
      name: 'Puku Dev',
      image: null,
    };

    await AsyncStorage.setItem('@pukubot_token', mockToken);
    await AsyncStorage.setItem('@pukubot_user', JSON.stringify(mockUser));

    // Force re-init from storage
    // @ts-ignore
    client.isInitialized = false;
    await client.init();

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getToken()).toBe(mockToken);
    expect(client.getUser()?.email).toBe('dev@puku.sh');

    // Test sign out
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await client.signOut();

    expect(client.isAuthenticated()).toBe(false);
    expect(client.getToken()).toBeNull();
    expect(client.getUser()).toBeNull();
    expect(await AsyncStorage.getItem('@pukubot_token')).toBeNull();
  });

  test('constructs screenshot URL with URL encoding', () => {
    const botId = 'research-desk/v1';
    const url = client.getScreenshotUrl(botId);
    expect(url).toContain(encodeURIComponent(botId));
    expect(url).toContain('/bots/research-desk%2Fv1/computer/screenshot');
  });

  test('fetches available Bots list', async () => {
    const mockBots = [
      {
        id: 'general-assistant',
        name: 'General Assistant',
        title: 'General Assistant',
        description: 'Direct AI assistant',
        avatarSeed: 'general-assistant',
      },
      {
        id: 'research-desk',
        name: 'Research Desk',
        title: 'Research Desk',
        description: 'Deep web research bot',
        avatarSeed: 'research-desk',
      },
    ];

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ bots: mockBots }),
    });

    const bots = await client.getBots();
    expect(bots).toHaveLength(2);
    expect(bots[0].id).toBe('general-assistant');
    expect(bots[1].id).toBe('research-desk');
  });

  test('fetches single Bot profile via /bots/:id', async () => {
    const mockBot = {
      id: 'general-assistant',
      name: 'General Assistant',
      title: 'General Assistant',
      description: 'Direct AI assistant',
      avatarSeed: 'general-assistant',
      skills: [{ slug: 'web-search', title: 'Web Search', summary: 'Search the web' }],
    };

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ bot: mockBot }),
    });

    const bot = await client.getBot('general-assistant');
    expect(bot.id).toBe('general-assistant');
    expect(bot.skills).toHaveLength(1);
    expect(bot.skills?.[0].title).toBe('Web Search');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/bots/general-assistant'),
      expect.anything()
    );
  });

  test('generates correct file download and WebSocket URLs', () => {
    const downloadUrl = client.getTaskFileDownloadUrl('general-assistant', 'reports/summary.md');
    expect(downloadUrl).toContain('/bots/general-assistant/files/download?path=reports%2Fsummary.md');

    const streamWs = client.getComputerStreamWsUrl('general-assistant');
    expect(streamWs).toMatch(/^wss?:\/\/.*\/api\/computers\/general-assistant\/stream$/);

    const desktopWs = client.getComputerDesktopWsUrl('general-assistant');
    expect(desktopWs).toMatch(/^wss?:\/\/.*\/api\/computers\/general-assistant\/desktop$/);
  });

  test('fetches user profile via /me', async () => {
    const mockUser = { id: 'usr_1', email: 'test@puku.sh', name: 'Tester', image: null };
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUser,
    });

    const user = await client.getMe();
    expect(user.id).toBe('usr_1');
    expect(user.email).toBe('test@puku.sh');
    expect(client.getUser()?.email).toBe('test@puku.sh');
  });

  test('manages conversations: list, create, get, delete, markRead', async () => {
    const mockConv = {
      id: 'channel_123',
      botId: 'general-assistant',
      title: 'New conversation',
      createdAt: '2026-09-30T10:00:00Z',
    };

    // 1. List conversations
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ conversations: [mockConv], nextCursor: null }),
    });

    const list = await client.getConversations();
    expect(list.conversations).toHaveLength(1);
    expect(list.conversations[0].id).toBe('channel_123');

    // 2. Create conversation
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ conversation: mockConv }),
    });

    const created = await client.createConversation('general-assistant');
    expect(created.id).toBe('channel_123');

    // 3. Get single conversation
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ conversation: mockConv }),
    });

    const fetched = await client.getConversation('channel_123');
    expect(fetched.id).toBe('channel_123');

    // 4. Mark read
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await expect(client.markConversationRead('channel_123')).resolves.toBeUndefined();

    // 5. Delete conversation
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.deleteConversation('channel_123')).resolves.toBeUndefined();
  });

  test('fetches messages via /conversations/:id/messages', async () => {
    const mockMessages = [
      { id: 'msg_1', role: 'user', text: 'Hello Bot' },
      { id: 'msg_2', role: 'assistant', text: 'Hello Human!' },
    ];

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        messages: mockMessages,
        hasMore: false,
        answering: false,
      }),
    });

    const result = await client.getMessages('channel_123');
    expect(result.messages).toHaveLength(2);
    expect(result.answering).toBe(false);
  });

  test('interacts with Bot computer endpoints: getComputer, control take/release, and secret', async () => {
    const mockComputerInfo = {
      status: {
        botId: 'general-assistant',
        state: 'ready' as const,
      },
      control: { holder: 'bot' as const, requestedBy: null },
      desktopSocket: 'ws://localhost:3001/desktop',
    };

    // 1. getComputer
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockComputerInfo,
    });

    const info = await client.getComputer('general-assistant');
    expect(info.status.state).toBe('ready');
    expect(info.control?.holder).toBe('bot');

    // 2. takeComputerControl
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, control: { holder: 'human' } }),
    });

    const takeRes = await client.takeComputerControl('general-assistant');
    expect(takeRes.ok).toBe(true);
    expect(takeRes.control.holder).toBe('human');

    // 3. releaseComputerControl
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, control: { holder: 'bot' } }),
    });

    const relRes = await client.releaseComputerControl('general-assistant');
    expect(relRes.ok).toBe(true);
    expect(relRes.control.holder).toBe('bot');

    // 4. sendComputerSecret
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const secRes = await client.sendComputerSecret('general-assistant', 'super-secret-token');
    expect(secRes.ok).toBe(true);
  });

  test('stopTurn issues POST to /conversations/:id/stop', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await client.stopTurn('channel_123');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/channel_123/stop'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('pinConversation issues PUT to /conversations/:id/pin', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await client.pinConversation('channel_123', true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/channel_123/pin'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ pinned: true }),
      })
    );
  });

  test('addBotToConversation issues POST to /conversations/:id/bots', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await client.addBotToConversation('channel_123', 'research-desk');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations/channel_123/bots'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ botId: 'research-desk' }),
      })
    );
  });

  test('rebuildComputer issues POST to /bots/:id/computer/rebuild with confirm REBUILD', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const res = await client.rebuildComputer('general-assistant');
    expect(res.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/bots/general-assistant/computer/rebuild'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: 'REBUILD' }),
      })
    );
  });

  test('manages personal instructions via /settings/instructions', async () => {
    // 1. Get instructions
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ instructions: 'Be concise and direct.' }),
    });

    const getRes = await client.getPersonalInstructions();
    expect(getRes.instructions).toBe('Be concise and direct.');

    // 2. Update instructions
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ instructions: 'Always output typescript.' }),
    });

    const updateRes = await client.updatePersonalInstructions('Always output typescript.');
    expect(updateRes.instructions).toBe('Always output typescript.');
  });

  test('manages memory offline (create, list, update, delete) and queues the writes', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const memory = await client.createMemory('User prefers dark mode', 'general-assistant');
    expect(memory.content).toBe('User prefers dark mode');
    expect(memory.kind).toBe('fact');

    const list = await client.getMemories('general-assistant');
    expect(list.some(m => m.content === 'User prefers dark mode')).toBe(true);
    // Memory is per Bot.
    expect(await client.getMemories('research-desk')).toEqual([]);

    const updated = await client.updateMemory(memory.id, 'User prefers dark mode and high contrast');
    expect(updated.content).toBe('User prefers dark mode and high contrast');

    await client.deleteMemory(memory.id);
    const afterDelete = await client.getMemories('general-assistant');
    expect(afterDelete.find(m => m.id === memory.id)).toBeUndefined();
  });

  test('memory uses the v1 field names: botId, kind, and a target Bot to share with', async () => {
    const ok = (body: any, status = 200) => ({ ok: true, status, json: async () => body });
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(ok({ memory: { id: 'm1', botId: 'general-assistant', kind: 'fact', content: 'x' } }))
      .mockResolvedValueOnce(ok({ memory: { id: 'm1', botId: 'general-assistant', kind: 'fact', content: 'x' } }));
    await client.createMemory('x', 'general-assistant');
    await client.shareMemory('m1', 'research-desk');
    const calls = (globalThis as any).fetch.mock.calls;
    expect(JSON.parse(calls[0][1].body)).toEqual({ botId: 'general-assistant', kind: 'fact', content: 'x' });
    expect(calls[1][0]).toContain('/api/v1/memory/m1/share');
    expect(JSON.parse(calls[1][1].body)).toEqual({ botId: 'research-desk' });
  });

  test('a server whose v1 API lacks memory falls back to the web route it wraps', async () => {
    const res = (status: number, body: any) => ({ ok: status < 300, status, json: async () => body });
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(res(404, { error: 'Not found' }))
      .mockResolvedValueOnce(
        res(200, { memories: [{ id: 'm1', agentId: 'general-assistant', kind: 'preference', content: 'Tea', accessCount: 3 }] })
      )
      .mockResolvedValueOnce(res(200, { memory: { id: 'm2', agentId: 'general-assistant', kind: 'fact', content: 'Dhaka' } }));

    const list = await client.getMemories('general-assistant');
    expect(list).toEqual([
      expect.objectContaining({ id: 'm1', botId: 'general-assistant', kind: 'preference', useCount: 3 }),
    ]);
    const calls = (globalThis as any).fetch.mock.calls;
    expect(calls[1][0]).toMatch(/\/api\/memory\?agentId=general-assistant$/);
    expect(calls[1][0]).not.toContain('/api/v1/');

    // Now known: writes go straight to the web route, in its field names.
    const created = await client.createMemory('Dhaka', 'general-assistant');
    expect(created.botId).toBe('general-assistant');
    expect(calls[2][0]).toMatch(/\/api\/memory$/);
    expect(JSON.parse(calls[2][1].body)).toEqual({ agentId: 'general-assistant', kind: 'fact', content: 'Dhaka' });
  });

  test('manages routines operations (list, toggle, delete)', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        routines: [
          { id: 'rt_1', agentId: 'general-assistant', instruction: 'Brief me', schedule: 'Weekdays at 09:00', enabled: true },
        ],
      }),
    });

    const routines = await client.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].id).toBe('rt_1');
    expect(routines[0].instruction).toBe('Brief me');

    // Toggle enabled
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        routine: { id: 'rt_1', instruction: 'Brief me', schedule: 'Weekdays at 09:00', enabled: false },
      }),
    });

    const toggled = await client.setRoutineEnabled('rt_1', false);
    expect(toggled.enabled).toBe(false);

    // Delete routine
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.deleteRoutine('rt_1')).resolves.toBeUndefined();
  });

  test('manages skills offline (save, list, delete)', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const skill = await client.saveSkill('Extract Table', {
      title: 'Extract Table',
      instructions: 'Extract tabular data as markdown.',
    });
    expect(skill.slug).toBe('extract-table');
    expect(skill.mine).toBe(true);

    const skills = await client.getSkills();
    expect(skills.some(s => s.slug === 'extract-table')).toBe(true);

    await client.deleteSkill('extract-table');
    const afterDelete = await client.getSkills();
    expect(afterDelete.some(s => s.slug === 'extract-table')).toBe(false);
  });

  test('saving a skill sends title and instructions, and refuses a slug the server would', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ skill: { slug: 'tldr', title: 'TL;DR', summary: '', instructions: 'Summarise.', mine: true, deployment: false } }),
    });
    await client.saveSkill('tldr', { title: 'TL;DR', instructions: 'Summarise.' });
    const [url, init] = (globalThis as any).fetch.mock.calls[0];
    expect(url).toContain('/api/v1/skills/tldr');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ title: 'TL;DR', instructions: 'Summarise.' });

    await expect(client.saveSkill('x', { title: 'X', instructions: 'y' })).rejects.toThrow(/slug/);
  });

  test('skills fall back to the web route and split into own and workspace skills', async () => {
    (client as any).user = { id: 'u1' };
    const res = (status: number, body: any) => ({ ok: status < 300, status, json: async () => body });
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(res(404, {}))
      .mockResolvedValueOnce(
        res(200, {
          skills: [
            { slug: 'mine-one', title: 'Mine', instructions: 'a', ownerUserId: 'u1' },
            { slug: 'check-a-claim', title: 'Check a claim', instructions: 'b', ownerUserId: null },
          ],
          servers: [],
        })
      )
      .mockResolvedValueOnce(res(200, { skills: [{ slug: 'new-one', title: 'New', instructions: 'c', ownerUserId: 'u1' }] }));

    const skills = await client.getSkills();
    expect(skills.find(s => s.slug === 'mine-one')).toEqual(expect.objectContaining({ mine: true, deployment: false }));
    expect(skills.find(s => s.slug === 'check-a-claim')).toEqual(expect.objectContaining({ mine: false, deployment: true }));
    const calls = (globalThis as any).fetch.mock.calls;
    expect(calls[1][0]).toMatch(/\/api\/plugins$/);

    const saved = await client.saveSkill('new-one', { title: 'New', instructions: 'c' });
    expect(saved.mine).toBe(true);
    expect(calls[2][0]).toMatch(/\/api\/plugins\/skills$/);
    expect(calls[2][1].method).toBe('POST');
    expect(JSON.parse(calls[2][1].body)).toEqual({ title: 'New', instructions: 'c', slug: 'new-one', global: false });

    // A workspace skill is read-only from the app.
    await expect(client.saveSkill('check-a-claim', { title: 'x', instructions: 'y' })).rejects.toThrow(/deployment/);
  });

  test('Agents, Marketplace and capabilities use the web routes', async () => {
    const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });
    const agent = { id: 'a1', name: 'Nova', title: 'Research', roleDescription: 'r', avatarSeed: 'a1', visibility: 'private', mine: true };
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(ok({ agents: [agent] }))
      .mockResolvedValueOnce(ok({ agent }))
      .mockResolvedValueOnce(ok({ marketplace: { templates: [{ agentId: 't1', name: 'PR Reviewer', category: 'engineering' }] } }))
      .mockResolvedValueOnce(ok({ agent: { ...agent, id: 'a2' } }))
      .mockResolvedValueOnce(ok({ agentCloudUrl: null, defaultBotId: 'general-assistant' }));

    expect(await client.getAgents()).toHaveLength(1);
    await client.createAgent({ name: 'Nova', title: 'Research', roleDescription: 'r' });
    const templates = await client.getMarketplace('engineering');
    expect(templates[0].agentId).toBe('t1');
    const installed = await client.installTemplate('t1');
    expect(installed.id).toBe('a2');
    expect((await client.getCapabilities()).agentCloudUrl).toBeNull();

    const calls = (globalThis as any).fetch.mock.calls.map((c: any[]) => [c[0], c[1]?.method]);
    const origin = client.getWebOrigin();
    expect(calls).toEqual([
      [`${origin}/api/agents`, undefined],
      [`${origin}/api/agents`, 'POST'],
      [`${origin}/api/agents/marketplace?category=engineering`, undefined],
      [`${origin}/api/agents/marketplace/t1/install`, 'POST'],
      [`${origin}/api/capabilities`, undefined],
    ]);
    expect(JSON.parse((globalThis as any).fetch.mock.calls[1][1].body)).toEqual({
      visibility: 'private',
      name: 'Nova',
      title: 'Research',
      roleDescription: 'r',
    });
    expect(client.getDocsUrl()).toBe(`${origin}/docs`);
  });

  test('manages connected accounts (list, connect, confirm, disconnect)', async () => {
    const ok = (body: any, status = 200) => ({ ok: true, status, json: async () => body });
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(
        ok({ connections: [{ id: 'github', kind: 'oauth', name: 'GitHub', vendor: 'GitHub', summary: '', connected: false, connectedAt: null }] })
      )
      .mockResolvedValueOnce(ok({ url: 'https://github.com/login/oauth/authorize?x=1' }))
      .mockResolvedValueOnce(ok({ ok: true }))
      .mockResolvedValueOnce(ok({}, 204));

    const connections = await client.getConnections();
    expect(connections).toHaveLength(1);

    const connectRes = await client.connectAccount('github');
    expect(connectRes.url).toBe('https://github.com/login/oauth/authorize?x=1');
    const [connectUrl, connectInit] = (globalThis as any).fetch.mock.calls[1];
    expect(connectUrl).toContain('/connections/github/connect');
    expect(connectInit.method).toBe('POST');

    const confirmRes = await client.confirmConnection('github');
    expect(confirmRes.ok).toBe(true);

    await client.deleteConnection('github');
    const afterDelete = await client.getConnections().catch(() => []);
    expect(Array.isArray(afterDelete)).toBe(true);
    expect((globalThis as any).fetch.mock.calls[3][1].method).toBe('DELETE');
  });

  test('connecting an account never fakes success when offline', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(client.connectAccount('github')).rejects.toThrow(/Cannot reach Puku Bot/);
    await expect(client.confirmConnection('github')).rejects.toThrow(/Cannot reach Puku Bot/);
  });

  test('offline: no fabricated connections or skills are returned', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await client.getConnections()).toEqual([]);
    expect(await client.getSkills()).toEqual([]);
  });

  test('server errors on P1 writes are surfaced, not replaced by a local fake', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A memory can be at most 2000 characters.' }),
    });
    await expect(client.createMemory('x'.repeat(5000), 'general-assistant')).rejects.toThrow(
      'A memory can be at most 2000 characters.'
    );
    await expect(client.setRoutineEnabled('rt_1', false)).rejects.toThrow(
      'A memory can be at most 2000 characters.'
    );
  });

  test('personal instructions are capped at 4,000 characters', async () => {
    (globalThis as any).fetch = jest.fn();
    await expect(client.updatePersonalInstructions('a'.repeat(4001))).rejects.toThrow(/4000/);
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  test('GET /me unwraps { user }', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'usr_2', email: 'rahim@example.com', name: 'rahim', image: null, role: 'user', onboarding: { step: 3, completedAt: null } },
      }),
    });
    const user = await client.getMe();
    expect(user.id).toBe('usr_2');
    expect(user.onboarding?.step).toBe(3);
  });

  test('app never calls POST /me/onboarding and updateOnboarding is not exposed', () => {
    expect((client as any).updateOnboarding).toBeUndefined();
  });

  test('screenshot source carries the bearer token', async () => {
    await client.setToken('tok_screen');
    const source = client.getScreenshotSource('general-assistant', 42);
    expect(source.uri).toContain('/bots/general-assistant/computer/screenshot?t=42');
    expect(source.headers?.Authorization).toBe('Bearer tok_screen');
  });

  test('deleteAccount calls DELETE /me with confirm: DELETE', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.deleteAccount()).resolves.toBeUndefined();
    // The server refuses DELETE /me without this exact confirmation.
    const [deleteUrl, deleteInit] = (globalThis as any).fetch.mock.calls[0];
    expect(deleteUrl).toMatch(/\/me$/);
    expect(deleteInit.method).toBe('DELETE');
    expect(JSON.parse(deleteInit.body)).toEqual({ confirm: 'DELETE' });
    expect(client.isAuthenticated()).toBe(false);
  });

  test('a 401 from one route does not end a session /me still accepts', async () => {
    await client.setToken('tok_still_good');
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Authentication required.' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'u1' } }) });
    await expect(client.getAgents()).rejects.toThrow('You are not allowed to do that.');
    expect(client.isAuthenticated()).toBe(true);
    // Never a server sign-out: that would end the session for real.
    const urls = (globalThis as any).fetch.mock.calls.map((c: any[]) => c[0]);
    expect(urls.some((u: string) => u.includes('/auth/sign-out'))).toBe(false);
  });

  test('a 401 that /me confirms ends the session on this device only', async () => {
    await client.setToken('tok_expired');
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Authentication required.' }) });
    await expect(client.getBots()).rejects.toThrow('Session expired. Please sign in again.');
    expect(client.isAuthenticated()).toBe(false);
    const urls = (globalThis as any).fetch.mock.calls.map((c: any[]) => c[0]);
    expect(urls.some((u: string) => u.includes('/auth/sign-out'))).toBe(false);
  });

  test('adding an agent to a chat answers the conversation with every Bot in it', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ conversation: { id: 'channel_5', botId: 'general-assistant', botIds: ['general-assistant', 'nova'] } }),
    });
    const conv = await client.addBotToConversation('channel_5', 'nova');
    expect(conv?.botIds).toEqual(['general-assistant', 'nova']);
    const [url, init] = (globalThis as any).fetch.mock.calls[0];
    expect(url).toContain('/conversations/channel_5/bots');
    expect(JSON.parse(init.body)).toEqual({ botId: 'nova' });
  });

  test('a server that needs a botId gets one: the router, else the default Bot', async () => {
    const res = (status: number, body: any) => ({ ok: status < 300, status, json: async () => body });
    const conversation = { id: 'channel_1', botId: 'research-desk', title: 'x' };
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(res(400, { error: 'botId or botIds is required.' }))
      .mockResolvedValueOnce(res(200, { agentId: 'research-desk' }))
      .mockResolvedValueOnce(res(201, { conversation }));
    const routed = await client.createConversation({ text: 'Find three sources on X' });
    expect(routed).toEqual(expect.objectContaining({ id: 'channel_1', routedBy: 'router' }));
    let calls = (globalThis as any).fetch.mock.calls;
    expect(calls[1][0]).toBe(`${client.getWebOrigin()}/api/route`);
    expect(JSON.parse(calls[2][1].body)).toEqual({ botId: 'research-desk' });

    // No router answer: the deployment's default Bot.
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(res(400, { error: 'botId or botIds is required.' }))
      .mockResolvedValueOnce(res(404, {}))
      .mockResolvedValueOnce(res(200, { bots: [{ id: 'a' }, { id: 'general-assistant', default: true }] }))
      .mockResolvedValueOnce(res(201, { conversation: { ...conversation, botId: 'general-assistant' } }));
    const fallback = await client.createConversation({ text: 'Hlw' });
    expect(fallback.routedBy).toBe('default');
    calls = (globalThis as any).fetch.mock.calls;
    expect(JSON.parse(calls[3][1].body)).toEqual({ botId: 'general-assistant' });
  });

  // A bare 404 (no JSON error) is a server without the route; a JSON one names a missing thing.
  const missingRoute = () => ({ ok: false, status: 404, text: async () => '404 Not Found', json: async () => null });
  const notFound = (error: string) => ({
    ok: false,
    status: 404,
    text: async () => JSON.stringify({ error }),
    json: async () => ({ error }),
  });

  test('deleteAccount never reports success on a server without DELETE /me', async () => {
    await client.setToken('tok_keep');
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce(missingRoute());
    await expect(client.deleteAccount()).rejects.toThrow(/not available on this server yet. Nothing was deleted/);
    expect(client.isAuthenticated()).toBe(true);
  });

  test('deleteAccount treats "already deleted" as done', async () => {
    await client.setToken('tok_gone');
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(notFound('Account not found.'))
      .mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    await expect(client.deleteAccount()).resolves.toBeUndefined();
    expect(client.isAuthenticated()).toBe(false);
  });

  test('rebuild and connected accounts say plainly when the server lacks them', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue(missingRoute());
    await expect(client.rebuildComputer('general-assistant')).rejects.toThrow(/not available on this server yet/);
    await expect(client.getConnections()).rejects.toThrow(/not available on this server yet/);
  });

  test('instructions and pin fall back to the web routes they wrap', async () => {
    const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce(missingRoute())
      .mockResolvedValueOnce(ok({ instructions: 'Keep it short.' }))
      .mockResolvedValueOnce(ok({ instructions: 'Shorter.' }))
      .mockResolvedValueOnce(ok({ pinned: true }));

    expect((await client.getPersonalInstructions()).instructions).toBe('Keep it short.');
    await client.updatePersonalInstructions('Shorter.');
    await client.pinConversation('channel_9', true);

    const calls = (globalThis as any).fetch.mock.calls;
    const origin = client.getWebOrigin();
    expect(calls[1][0]).toBe(`${origin}/api/settings/instructions`);
    expect([calls[2][0], calls[2][1].method]).toEqual([`${origin}/api/settings/instructions`, 'PUT']);
    expect(JSON.parse(calls[2][1].body)).toEqual({ instructions: 'Shorter.' });
    expect([calls[3][0], calls[3][1].method]).toEqual([`${origin}/api/channels/channel_9/pin`, 'PUT']);
    expect(JSON.parse(calls[3][1].body)).toEqual({ pinned: true });
  });
});

