import { DEFAULT_AVAILABLE_BOTS, INITIAL_BOT_CONVERSATIONS } from '../src/store/AppContext';

describe('Puku Bot Dedicated World & State Contracts', () => {
  test('DEFAULT_AVAILABLE_BOTS contains General Assistant, Coder Bot, and Computer Operator', () => {
    expect(DEFAULT_AVAILABLE_BOTS.length).toBeGreaterThanOrEqual(3);
    const botIds = DEFAULT_AVAILABLE_BOTS.map(b => b.id);
    expect(botIds).toContain('general-assistant');
    expect(botIds).toContain('coder-bot');
    expect(botIds).toContain('computer-operator');
  });

  test('INITIAL_BOT_CONVERSATIONS contains pre-populated bot sessions with messages', () => {
    expect(INITIAL_BOT_CONVERSATIONS.length).toBeGreaterThanOrEqual(2);
    INITIAL_BOT_CONVERSATIONS.forEach(conv => {
      expect(conv.id).toBeDefined();
      expect(conv.botId).toBeDefined();
      expect(conv.title).toBeTruthy();
      expect(Array.isArray(conv.messages)).toBe(true);
      expect(conv.messages.length).toBeGreaterThan(0);
    });
  });

  test('INITIAL_BOT_CONVERSATIONS includes autonomous computer monitor session', () => {
    const monitorConv = INITIAL_BOT_CONVERSATIONS.find(c => c.botId === 'general-assistant');
    expect(monitorConv).toBeDefined();
    expect(monitorConv?.title).toBe('Autonomous System Monitor');
  });
});
