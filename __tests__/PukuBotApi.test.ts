import AsyncStorage from '@react-native-async-storage/async-storage';
import { PukuBotApiClient } from '../src/services/pukuBotApi';
import { generatePkcePair, generateRandomString, sha256, toBase64Url } from '../src/utils/auth';

describe('PukuBot API (v1) Client & PKCE Flow', () => {
  let client: PukuBotApiClient;

  beforeEach(async () => {
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
    client['isInitialized'] = false;
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
});
