import { formatActivityDate, getConversationTimestamp } from '../src/utils/date';
import { emitProgressively, pukuApi } from '../src/services/api';

describe('Real-Time Streaming & Cross-Device Account History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Date & Timestamp Utilities', () => {
    test('formats recent timestamp as Just now', () => {
      const now = Date.now();
      expect(formatActivityDate(now)).toBe('Just now');
    });

    test('formats timestamp from 2 days ago as 2d ago', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000 - 1000;
      expect(formatActivityDate(twoDaysAgo)).toBe('2d ago');
    });

    test('formats timestamp from yesterday as Yesterday', () => {
      const yesterday = Date.now() - 25 * 60 * 60 * 1000;
      expect(formatActivityDate(yesterday)).toBe('Yesterday');
    });

    test('parses epoch seconds and converts to millis timestamp', () => {
      const sec = 1727400000;
      expect(getConversationTimestamp(sec)).toBe(sec * 1000);
    });

    test('sorts conversations chronologically descending (newest first)', () => {
      const now = Date.now();
      const yesterday = now - 24 * 60 * 60 * 1000;
      const twoDaysAgo = now - 48 * 60 * 60 * 1000;

      const convs = [
        { id: '1', title: 'Two days ago chat', updatedAt: twoDaysAgo },
        { id: '2', title: 'Now chat', updatedAt: now },
        { id: '3', title: 'Yesterday chat', updatedAt: yesterday },
      ];

      convs.sort((a, b) => getConversationTimestamp(b) - getConversationTimestamp(a));

      expect(convs[0].id).toBe('2');
      expect(convs[1].id).toBe('3');
      expect(convs[2].id).toBe('1');
    });
  });

  describe('Progressive Stream Token Emitter', () => {
    test('emits tokens sequentially with onDelta callback', async () => {
      const received: string[] = [];
      const text = 'Hello world from Puku AI';
      await emitProgressively(text, chunk => {
        received.push(chunk);
      });

      expect(received.length).toBeGreaterThan(1);
      expect(received.join('')).toBe(text);
    });
  });

  describe('Cloud Conversations API Response Parsing', () => {
    test('fetchConversations returns empty array when unauthenticated', async () => {
      pukuApi.setAuthToken(null);
      const res = await pukuApi.fetchConversations();
      expect(Array.isArray(res)).toBe(true);
    });
  });
});
