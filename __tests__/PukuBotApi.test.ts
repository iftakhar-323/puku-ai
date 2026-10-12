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
      skills: [{ slug: 'web-search', name: 'Web Search', prompt: 'Search' }],
    };

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ bot: mockBot }),
    });

    const bot = await client.getBot('general-assistant');
    expect(bot.id).toBe('general-assistant');
    expect(bot.skills).toHaveLength(1);
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

  test('manages memory operations (CRUD and share)', async () => {
    // 1. Create memory
    const memory = await client.createMemory('User prefers dark mode', 'general-assistant');
    expect(memory.content).toBe('User prefers dark mode');

    // 2. Get memories
    const list = await client.getMemories('general-assistant');
    expect(list.some(m => m.content === 'User prefers dark mode')).toBe(true);

    // 3. Update memory
    const updated = await client.updateMemory(memory.id, 'User prefers dark mode and high contrast');
    expect(updated.content).toBe('User prefers dark mode and high contrast');

    // 4. Share memory
    await client.shareMemory(memory.id);
    const sharedList = await client.getMemories();
    const found = sharedList.find(m => m.id === memory.id);
    expect(found?.shared).toBe(true);

    // 5. Delete memory
    await client.deleteMemory(memory.id);
    const afterDelete = await client.getMemories();
    expect(afterDelete.find(m => m.id === memory.id)).toBeUndefined();
  });

  test('manages routines operations (list, toggle, delete)', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        routines: [
          { id: 'rt_1', name: 'Morning briefing', schedule: '0 9 * * 1-5', enabled: true, prompt: 'Brief me' },
        ],
      }),
    });

    const routines = await client.getRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].id).toBe('rt_1');

    // Toggle enabled
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        routine: { id: 'rt_1', name: 'Morning briefing', schedule: '0 9 * * 1-5', enabled: false, prompt: 'Brief me' },
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

  test('manages skills operations (list, save, delete)', async () => {
    // 1. Save skill
    const skill = await client.saveSkill('extract-table', {
      name: 'Extract Table',
      description: 'Extract tables to markdown',
      prompt: 'Extract tabular data from {text}',
    });
    expect(skill.slug).toBe('extract-table');

    // 2. Get skills
    const skills = await client.getSkills();
    expect(skills.some(s => s.slug === 'extract-table')).toBe(true);

    // 3. Delete skill
    await client.deleteSkill('extract-table');
    const afterDelete = await client.getSkills();
    expect(afterDelete.some(s => s.slug === 'extract-table')).toBe(false);
  });

  test('manages connected accounts (list, connect, confirm, disconnect)', async () => {
    const connections = await client.getConnections();
    expect(connections.length).toBeGreaterThan(0);

    const connectRes = await client.connectAccount('github');
    expect(connectRes.url).toBeDefined();

    const confirmRes = await client.confirmConnection('github');
    expect(confirmRes.ok).toBe(true);

    await client.deleteConnection('github');
    const afterDelete = await client.getConnections();
    const github = afterDelete.find(c => c.id === 'github');
    expect(github?.connected).toBe(false);
  });

  test('onboarding and deleteAccount calls', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const onboardRes = await client.updateOnboarding(2);
    expect(onboardRes.ok).toBe(true);

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.deleteAccount()).resolves.toBeUndefined();
    expect(client.isAuthenticated()).toBe(false);
  });
});

