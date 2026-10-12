import AsyncStorage from '@react-native-async-storage/async-storage';
import { ignore } from '../utils/devLog';

export const OUTBOX_STORAGE_KEY = '@pukubot_outbox';
export const OUTBOX_USER_KEY = '@pukubot_outbox_user_id';

export interface PukuBotOutboxEntry {
  id: string;
  userId?: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
  tempId?: string;
}

type OutboxChangeListener = (entries: PukuBotOutboxEntry[], lastError?: string) => void;

class PukuBotOutboxManager {
  private static instance: PukuBotOutboxManager;
  private isReplaying = false;
  private listeners: Set<OutboxChangeListener> = new Set();
  private lastNoticeError: string | null = null;

  public static getInstance(): PukuBotOutboxManager {
    if (!PukuBotOutboxManager.instance) {
      PukuBotOutboxManager.instance = new PukuBotOutboxManager();
    }
    return PukuBotOutboxManager.instance;
  }

  public subscribe(listener: OutboxChangeListener): () => void {
    this.listeners.add(listener);
    this.getEntries().then(entries => {
      listener(entries, this.lastNoticeError || undefined);
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    const entries = await this.getEntries();
    for (const listener of this.listeners) {
      try {
        listener(entries, this.lastNoticeError || undefined);
      } catch (err) {
        ignore('pukuBotOutbox')(err);
      }
    }
  }

  public setLastNoticeError(error: string | null): void {
    this.lastNoticeError = error;
    this.notifyListeners();
  }

  public getLastNoticeError(): string | null {
    return this.lastNoticeError;
  }

  public async getEntries(): Promise<PukuBotOutboxEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public async saveEntries(entries: PukuBotOutboxEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(entries));
      await this.notifyListeners();
    } catch (err) {
      ignore('pukuBotOutbox')(err);
    }
  }

  public async clear(): Promise<void> {
    await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
    this.lastNoticeError = null;
    await this.notifyListeners();
  }

  /**
   * Enqueues a write and collapses redundant entries:
   * - Instructions saves: only keep the last.
   * - Create memory then delete memory on the same local tempId: drop both.
   * - Update memory on a tempId: fold into original create body.
   * - Duplicate routine enable/disable: keep the last.
   * - Duplicate skill saves: keep the last.
   */
  public async enqueue(
    entry: Omit<PukuBotOutboxEntry, 'id' | 'createdAt' | 'attempts'>
  ): Promise<PukuBotOutboxEntry | null> {
    const entries = await this.getEntries();
    const newEntry: PukuBotOutboxEntry = {
      ...entry,
      id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    // 1. Instructions: keep only the latest PUT /settings/instructions
    if (newEntry.path === '/settings/instructions') {
      const filtered = entries.filter(e => e.path !== '/settings/instructions');
      filtered.push(newEntry);
      await this.saveEntries(filtered);
      return newEntry;
    }

    // 2. Memory create followed by delete on same tempId: drop both
    if (newEntry.method === 'DELETE' && newEntry.path.startsWith('/memory/mem_')) {
      const tempId = newEntry.path.replace('/memory/', '').split('/')[0];
      const createIndex = entries.findIndex(
        e => e.method === 'POST' && e.path === '/memory' && e.tempId === tempId
      );
      if (createIndex !== -1) {
        // Drop the pending create and any updates/shares on this tempId
        const filtered = entries.filter(
          e => !(e.tempId === tempId || e.path.includes(`/memory/${tempId}`))
        );
        await this.saveEntries(filtered);
        return null;
      }
    }

    // 3. Memory update on a pending tempId: update the create body
    if (newEntry.method === 'PUT' && newEntry.path.startsWith('/memory/mem_')) {
      const tempId = newEntry.path.replace('/memory/', '').split('/')[0];
      const createIndex = entries.findIndex(
        e => e.method === 'POST' && e.path === '/memory' && e.tempId === tempId
      );
      if (createIndex !== -1) {
        entries[createIndex].body = {
          ...entries[createIndex].body,
          content: newEntry.body?.content,
        };
        await this.saveEntries(entries);
        return entries[createIndex];
      }
    }

    // 4. Routines toggle on the same routine: keep the last
    if (newEntry.path.startsWith('/routines/') && newEntry.path.endsWith('/enabled')) {
      const filtered = entries.filter(e => e.path !== newEntry.path);
      filtered.push(newEntry);
      await this.saveEntries(filtered);
      return newEntry;
    }

    // 5. Skills save on the same slug: keep the last
    if (newEntry.method === 'PUT' && newEntry.path.startsWith('/skills/')) {
      const filtered = entries.filter(e => e.path !== newEntry.path);
      filtered.push(newEntry);
      await this.saveEntries(filtered);
      return newEntry;
    }

    // 6. Delete routine or delete skill: remove any pending save on it
    if (newEntry.method === 'DELETE') {
      const filtered = entries.filter(e => e.path !== newEntry.path);
      filtered.push(newEntry);
      await this.saveEntries(filtered);
      return newEntry;
    }

    entries.push(newEntry);
    await this.saveEntries(entries);
    return newEntry;
  }

  /**
   * Replays outbox entries sequentially.
   * Only one replay can run at a time.
   */
  public async replay(client: {
    getBaseUrl: () => string;
    getAuthHeaders: (extra?: Record<string, string>) => Record<string, string>;
    signOut: () => Promise<void>;
    updateCachedMemoryId: (tempId: string, realMemory: any) => Promise<void>;
    /** Sends one entry, routing it where this server serves it. Throws when the network fails. */
    send?: (entry: PukuBotOutboxEntry) => Promise<Response>;
  }): Promise<{ replayed: number; failed: boolean }> {
    if (this.isReplaying) return { replayed: 0, failed: false };
    this.isReplaying = true;

    let replayedCount = 0;
    try {
      let entries = await this.getEntries();
      if (entries.length === 0) {
        this.isReplaying = false;
        return { replayed: 0, failed: false };
      }

      const baseUrl = client.getBaseUrl();

      while (entries.length > 0) {
        const entry = entries[0];
        try {
          const res = client.send
            ? await client.send(entry)
            : await fetch(`${baseUrl}${entry.path}`, {
                method: entry.method,
                headers: client.getAuthHeaders(
                  entry.body ? { 'Content-Type': 'application/json' } : undefined
                ),
                body: entry.body ? JSON.stringify(entry.body) : undefined,
              });

          if (res.ok) {
            // 2xx Success: update cache and remap tempId if applicable
            if (entry.method === 'POST' && entry.path === '/memory' && entry.tempId) {
              const data = await res.json().catch(() => null);
              const realMemory = data?.memory || data;
              if (realMemory?.id) {
                const realId = realMemory.id;
                await client.updateCachedMemoryId(entry.tempId, realMemory);

                // Remap in remaining queued outbox entries
                for (let i = 1; i < entries.length; i++) {
                  if (entries[i].tempId === entry.tempId) {
                    entries[i].tempId = realId;
                  }
                  if (entries[i].path.includes(entry.tempId)) {
                    entries[i].path = entries[i].path.replace(entry.tempId, realId);
                  }
                }
              }
            }

            // Remove replayed entry
            entries.shift();
            replayedCount++;
            await this.saveEntries(entries);
          } else if (res.status === 401) {
            // 401: stop, keep outbox, sign out
            await client.signOut();
            this.isReplaying = false;
            return { replayed: replayedCount, failed: true };
          } else if (res.status >= 400 && res.status < 500) {
            // Other 4xx: drop entry, record lastError and readable notice
            const errBody = await res.json().catch(() => ({}));
            const errMsg = errBody.error || `Error ${res.status}`;
            this.setLastNoticeError(`1 offline change couldn't be saved: ${errMsg}`);
            entries.shift();
            await this.saveEntries(entries);
          } else {
            // 5xx Server Error: stop and retry later
            entry.attempts += 1;
            entry.lastError = `Server error ${res.status}`;
            await this.saveEntries(entries);
            this.isReplaying = false;
            return { replayed: replayedCount, failed: true };
          }
        } catch (netErr: any) {
          // Network failure: stop replaying, keep entry, retry later
          entry.attempts += 1;
          entry.lastError = netErr?.message || 'Network failure';
          await this.saveEntries(entries);
          this.isReplaying = false;
          return { replayed: replayedCount, failed: true };
        }
      }

      this.isReplaying = false;
      return { replayed: replayedCount, failed: false };
    } catch {
      this.isReplaying = false;
      return { replayed: replayedCount, failed: true };
    }
  }
}

export const pukuBotOutbox = PukuBotOutboxManager.getInstance();

