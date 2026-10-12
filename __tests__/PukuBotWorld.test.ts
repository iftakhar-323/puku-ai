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

  test('parseBotContent correctly separates thought process tags from response text', () => {
    const { parseBotContent } = require('../src/features/puku_bot/PukuBotScreen');

    // Case 1: Standard response without thoughts
    const r1 = parseBotContent('Hello, how can I help you?');
    expect(r1.thoughts).toBe('');
    expect(r1.responseText).toBe('Hello, how can I help you?');

    // Case 2: Closed <thought> tags
    const r2 = parseBotContent('<thought>Checking user documents</thought>Here is the document analysis.');
    expect(r2.thoughts).toBe('Checking user documents');
    expect(r2.responseText).toBe('Here is the document analysis.');

    // Case 3: Closed <thinking> tags
    const r3 = parseBotContent('<thinking>Planning code structure</thinking>Here is the implementation.');
    expect(r3.thoughts).toBe('Planning code structure');
    expect(r3.responseText).toBe('Here is the implementation.');

    // Case 4: Streaming / unclosed thought tag
    const r4 = parseBotContent('<thought>Currently analyzing repository structure...');
    expect(r4.thoughts).toBe('Currently analyzing repository structure...');
    expect(r4.responseText).toBe('');

    // Case 5: Empty input
    const r5 = parseBotContent('');
    expect(r5.thoughts).toBe('');
    expect(r5.responseText).toBe('');
  });

  test('formatToolDisplay formats Wikipedia and web tools cleanly without technical errors', () => {
    const { formatToolDisplay } = require('../src/features/puku_bot/PukuBotScreen');

    // Case 1: Wikipedia navigation
    const t1 = formatToolDisplay(
      'computer_navigate',
      { url: 'https://en.wikipedia.org/wiki/Dhaka' },
      'completed',
      { ok: false, reason: 'Quota exceeded' }
    );
    expect(t1.label).toBe('Wikipedia • Dhaka');
    expect(t1.sourceUrl).toBe('https://en.wikipedia.org/wiki/Dhaka');
    expect(t1.cleanResult).toBeUndefined(); // ok:false error suppressed

    // Case 2: General website navigation
    const t2 = formatToolDisplay(
      'computer_navigate',
      { url: 'https://poridhi.io/docs' },
      'completed',
      { output: 'Documentation loaded' }
    );
    expect(t2.label).toBe('Browsing poridhi.io');
    expect(t2.sourceUrl).toBe('https://poridhi.io/docs');
    expect(t2.cleanResult).toBe('Documentation loaded');

    // Case 3: Web search
    const t3 = formatToolDisplay('web_search', { query: 'Dhaka weather' });
    expect(t3.label).toBe('Searching: "Dhaka weather"');

    // Case 4: Terminal command
    const t4 = formatToolDisplay('execute_command', { command: 'ls -la' });
    expect(t4.label).toBe('Terminal command');
  });

  test('validates skill trigger extraction from input text', () => {
    const extractSkillSlug = (text: string): string | undefined => {
      if (text.startsWith('/')) {
        const firstWord = text.slice(1).split(/\s+/)[0];
        if (firstWord) return firstWord.toLowerCase();
      }
      return undefined;
    };

    expect(extractSkillSlug('/web-search search query')).toBe('web-search');
    expect(extractSkillSlug('/summarize')).toBe('summarize');
    expect(extractSkillSlug('/code-review debug this bug')).toBe('code-review');
    expect(extractSkillSlug('Just normal text with / in it')).toBeUndefined();
    expect(extractSkillSlug('')).toBeUndefined();
  });

  test('PukuBotScreen exports and component initialization', () => {
    const { PukuBotScreen } = require('../src/features/puku_bot/PukuBotScreen');
    expect(PukuBotScreen).toBeDefined();
    expect(typeof PukuBotScreen).toBe('function');
  });
});
