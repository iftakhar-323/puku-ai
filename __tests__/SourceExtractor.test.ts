import { extractSources, getCleanDomain, getSourceTitle } from '../src/utils/sourceExtractor';

describe('sourceExtractor', () => {
  it('extracts clean domain from various URLs', () => {
    expect(getCleanDomain('https://en.wikipedia.org/wiki/React')).toBe('en.wikipedia.org');
    expect(getCleanDomain('http://www.google.com/search?q=test')).toBe('google.com');
    expect(getCleanDomain('https://github.com/facebook/react-native')).toBe('github.com');
  });

  it('formats friendly title from URL path or explicit label', () => {
    expect(getSourceTitle('https://en.wikipedia.org/wiki/Artificial_intelligence')).toBe('Artificial intelligence');
    expect(getSourceTitle('https://example.com/docs', 'Documentation')).toBe('Documentation');
    expect(getSourceTitle('https://example.com', '[1]')).toBe('example.com');
  });

  it('extracts sources from trailing markdown sources block and cleans text', () => {
    const raw = `Here is the explanation of artificial intelligence.

Sources:
1. [Wikipedia](https://en.wikipedia.org/wiki/Artificial_intelligence)
2. https://wired.com/story/ai-news`;

    const { sources, cleanText } = extractSources(raw);

    expect(sources).toHaveLength(2);
    expect(sources[0].title).toBe('Wikipedia');
    expect(sources[0].url).toBe('https://en.wikipedia.org/wiki/Artificial_intelligence');
    expect(sources[0].domain).toBe('en.wikipedia.org');

    expect(sources[1].url).toBe('https://wired.com/story/ai-news');
    expect(sources[1].domain).toBe('wired.com');

    expect(cleanText).toBe('Here is the explanation of artificial intelligence.');
  });

  it('extracts sources from inline markdown citations', () => {
    const raw = 'According to [Research](https://nature.com/articles/123), quantum computing is evolving.';
    const { sources, cleanText } = extractSources(raw);

    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe('Research');
    expect(sources[0].url).toBe('https://nature.com/articles/123');
    expect(cleanText).toBe(raw);
  });

  it('extracts sources from tool calls', () => {
    const toolCalls = [
      {
        name: 'web_search',
        arguments: { query: 'React Native 0.76', url: 'https://reactnative.dev/blog' },
      },
      {
        name: 'fetch_url',
        result: { url: 'https://github.com/facebook/react-native', title: 'React Native GitHub' },
      },
    ];

    const { sources } = extractSources('Summary of search results', toolCalls);

    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe('https://reactnative.dev/blog');
    expect(sources[1].url).toBe('https://github.com/facebook/react-native');
    expect(sources[1].title).toBe('React Native GitHub');
  });
});

