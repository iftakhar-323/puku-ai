import { DEFAULT_AVAILABLE_BOTS, INITIAL_BOT_CONVERSATIONS } from '../src/store/AppContext';

describe('Puku Bot Dedicated World & State Contracts', () => {
  test('DEFAULT_AVAILABLE_BOTS contains General Assistant, Coder Bot, and Computer Operator', () => {
    expect(DEFAULT_AVAILABLE_BOTS.length).toBeGreaterThanOrEqual(3);
    const botIds = DEFAULT_AVAILABLE_BOTS.map(b => b.id);
    expect(botIds).toContain('general-assistant');
    expect(botIds).toContain('coder-bot');
    expect(botIds).toContain('computer-operator');
  });

  test('INITIAL_BOT_CONVERSATIONS has no seeded (fabricated) history', () => {
    // The Bot home lists the person's real conversations only.
    expect(INITIAL_BOT_CONVERSATIONS).toEqual([]);
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
    expect(t1.label).toBe('Checking Wikipedia • Dhaka');
    expect(t1.sourceUrl).toBe('https://en.wikipedia.org/wiki/Dhaka');
    expect(t1.cleanResult).toBeUndefined(); // ok:false error suppressed

    // Case 2: General website navigation
    const t2 = formatToolDisplay(
      'computer_navigate',
      { url: 'https://poridhi.io/docs' },
      'completed',
      { output: 'Documentation loaded' }
    );
    expect(t2.label).toBe('Opening poridhi.io');
    expect(t2.sourceUrl).toBe('https://poridhi.io/docs');
    expect(t2.cleanResult).toBe('Documentation loaded');

    // Case 3: Web search
    const t3 = formatToolDisplay('web_search', { query: 'Dhaka weather' });
    expect(t3.label).toBe('Searching: "Dhaka weather"');

    // Case 4: Terminal command
    const t4 = formatToolDisplay('execute_command', { command: 'ls -la' });
    expect(t4.label).toBe('Running a command');

    // Case 5: computer tools read as plain activity, never raw names or flags
    expect(formatToolDisplay('computer_click', { x: 1, y: 2 }).label).toBe('Clicking');
    expect(formatToolDisplay('computer_screenshot').label).toBe('Looking at the screen');
    const t6 = formatToolDisplay('computer_navigate', {}, 'completed', false);
    expect(t6.label).toBe('Opening a web page');
    expect(t6.cleanResult).toBeUndefined();
  });

  test('splitSkillCommand only treats skills the Bot holds as skills', () => {
    const { splitSkillCommand } = require('../src/features/puku_bot/PukuBotScreen');
    const held = ['web-search', 'summarize'];

    expect(splitSkillCommand('/web-search Dhaka weather', held)).toEqual({
      skill: 'web-search',
      body: 'Dhaka weather',
    });
    expect(splitSkillCommand('/Summarize', held)).toEqual({ skill: 'summarize', body: '' });
    // Unknown slug: sent as plain text, so the server never answers 400.
    expect(splitSkillCommand('/code-review this', held)).toEqual({ body: '/code-review this' });
    expect(splitSkillCommand('Just normal text with / in it', held)).toEqual({
      body: 'Just normal text with / in it',
    });
  });

  test('describeTurnFailure gives people a readable line, never internals', () => {
    const { describeTurnFailure } = require('../src/features/puku_bot/PukuBotScreen');

    expect(describeTurnFailure({ code: 'stopped' })).toBeNull();
    expect(describeTurnFailure({ code: 'busy' })).toMatch(/still answering/);
    expect(describeTurnFailure({ code: 'timeout' })).toMatch(/too long/);
    // A server sentence is shown as is...
    expect(describeTurnFailure({ code: 'error', message: 'Slow down — too many requests.' })).toBe(
      'Slow down — too many requests.'
    );
    // ...but payloads, stack traces and flags are not.
    for (const message of ['{"ok":false,"reason":"x"}', 'TypeError: undefined is not a function', 'false']) {
      expect(describeTurnFailure({ code: 'error', message })).toMatch(/couldn't finish/);
    }
  });

  test('PukuBotScreen exports and component initialization', () => {
    const { PukuBotScreen } = require('../src/features/puku_bot/PukuBotScreen');
    expect(PukuBotScreen).toBeDefined();
    expect(typeof PukuBotScreen).toBe('function');
  });
});
