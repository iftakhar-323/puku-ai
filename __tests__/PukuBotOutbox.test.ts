import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pukuBotOutbox,
  OUTBOX_STORAGE_KEY,
  OUTBOX_USER_KEY,
} from '../src/services/pukuBotOutbox';

describe('PukuBot Outbox & Offline Auto-Sync', () => {
  beforeEach(async () => {
    await pukuBotOutbox.clear();
    await AsyncStorage.clear();
  });

  test('collapses duplicate personal instructions saves (keeps the last)', async () => {
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/settings/instructions',
      body: { instructions: 'First draft' },
    });
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/settings/instructions',
      body: { instructions: 'Final concise prompt' },
    });

    const entries = await pukuBotOutbox.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('/settings/instructions');
    expect(entries[0].body).toEqual({ instructions: 'Final concise prompt' });
  });

  test('drops both create and delete for the same offline temp memory', async () => {
    const tempId = 'mem_12345';
    await pukuBotOutbox.enqueue({
      method: 'POST',
      path: '/memory',
      body: { content: 'Temporary memory' },
      tempId,
    });

    let entries = await pukuBotOutbox.getEntries();
    expect(entries).toHaveLength(1);

    // Now delete that temporary memory before syncing
    const result = await pukuBotOutbox.enqueue({
      method: 'DELETE',
      path: `/memory/${tempId}`,
    });

    expect(result).toBeNull();
    entries = await pukuBotOutbox.getEntries();
    expect(entries).toHaveLength(0);
  });

  test('updates the body of pending create if updated before sync', async () => {
    const tempId = 'mem_update_test';
    await pukuBotOutbox.enqueue({
      method: 'POST',
      path: '/memory',
      body: { content: 'Initial text' },
      tempId,
    });

    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: `/memory/${tempId}`,
      body: { content: 'Corrected text' },
    });

    const entries = await pukuBotOutbox.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].body.content).toBe('Corrected text');
  });

  test('collapses routine enable toggles to the last state', async () => {
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/routines/rt_1/enabled',
      body: { enabled: true },
    });
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/routines/rt_1/enabled',
      body: { enabled: false },
    });

    const entries = await pukuBotOutbox.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].body.enabled).toBe(false);
  });

  test('replay succeeds with 2xx and maps tempId to server id', async () => {
    const tempId = 'mem_temp_abc';
    await pukuBotOutbox.enqueue({
      method: 'POST',
      path: '/memory',
      body: { content: 'Offline memory' },
      tempId,
    });
    await pukuBotOutbox.enqueue({
      method: 'POST',
      path: `/memory/${tempId}/share`,
    });

    let mappedTempId: string | null = null;
    let mappedRealMemory: any = null;

    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          memory: { id: 'real_mem_999', content: 'Offline memory', shared: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

    const client = {
      getBaseUrl: () => 'https://app.bot.puku.sh/api/v1',
      getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
      signOut: jest.fn(),
      updateCachedMemoryId: async (tid: string, realMem: any) => {
        mappedTempId = tid;
        mappedRealMemory = realMem;
      },
    };

    const res = await pukuBotOutbox.replay(client);
    expect(res.replayed).toBe(2);
    expect(res.failed).toBe(false);

    expect(mappedTempId).toBe(tempId);
    expect(mappedRealMemory.id).toBe('real_mem_999');

    // The second call path should have remapped the tempId to real_mem_999!
    expect((globalThis as any).fetch.mock.calls[1][0]).toContain('/memory/real_mem_999/share');

    const remaining = await pukuBotOutbox.getEntries();
    expect(remaining).toHaveLength(0);
  });

  test('replay stops on network failure and keeps entry for next trigger', async () => {
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/settings/instructions',
      body: { instructions: 'Offline test' },
    });

    (globalThis as any).fetch = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'));

    const client = {
      getBaseUrl: () => 'https://app.bot.puku.sh/api/v1',
      getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
      signOut: jest.fn(),
      updateCachedMemoryId: jest.fn(),
    };

    const res = await pukuBotOutbox.replay(client);
    expect(res.replayed).toBe(0);
    expect(res.failed).toBe(true);

    const remaining = await pukuBotOutbox.getEntries();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].attempts).toBe(1);
  });

  test('replay on 401 stops, keeps outbox, and calls signOut', async () => {
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/settings/instructions',
      body: { instructions: 'Auth expired test' },
    });

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Session expired' }),
    });

    const client = {
      getBaseUrl: () => 'https://app.bot.puku.sh/api/v1',
      getAuthHeaders: () => ({ Authorization: 'Bearer expired' }),
      signOut: jest.fn(),
      updateCachedMemoryId: jest.fn(),
    };

    const res = await pukuBotOutbox.replay(client);
    expect(res.failed).toBe(true);
    expect(client.signOut).toHaveBeenCalled();

    const remaining = await pukuBotOutbox.getEntries();
    expect(remaining).toHaveLength(1);
  });

  test('replay on other 4xx drops entry and records lastError notice', async () => {
    await pukuBotOutbox.enqueue({
      method: 'PUT',
      path: '/skills/invalid-skill',
      body: { name: 'Invalid', prompt: 'test' },
    });

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid skill slug provided.' }),
    });

    const client = {
      getBaseUrl: () => 'https://app.bot.puku.sh/api/v1',
      getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
      signOut: jest.fn(),
      updateCachedMemoryId: jest.fn(),
    };

    const res = await pukuBotOutbox.replay(client);
    expect(res.replayed).toBe(0);

    const notice = pukuBotOutbox.getLastNoticeError();
    expect(notice).toBe("1 offline change couldn't be saved: Invalid skill slug provided.");

    const remaining = await pukuBotOutbox.getEntries();
    expect(remaining).toHaveLength(0);
  });
});

