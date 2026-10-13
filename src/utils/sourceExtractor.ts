export interface ChatSourceItem {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

/**
 * Extracts clean domain name from any URL (e.g. "https://en.wikipedia.org/wiki/React" -> "wikipedia.org")
 */
export function getCleanDomain(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  try {
    if (typeof URL !== 'undefined') {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const host = parsed.hostname.toLowerCase().replace(/^www\./i, '');
      return host;
    }
  } catch {}
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  return match ? match[1].toLowerCase() : trimmed;
}

/**
 * Formats a user-friendly title for a source item based on domain and URL path
 */
export function getSourceTitle(url: string, explicitTitle?: string): string {
  if (explicitTitle && explicitTitle.trim() && !explicitTitle.startsWith('http') && !/^\[\d+\]$/.test(explicitTitle.trim())) {
    return explicitTitle.trim();
  }
  const domain = getCleanDomain(url);
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      const clean = decodeURIComponent(last).replace(/[-_]/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '');
      if (clean.length > 2 && clean.length < 40) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    }
  } catch {}
  return domain;
}

/**
 * Parses online sources and citations from AI text output and tool calls.
 * Removes trailing redundant "Sources:" text blocks from cleanText so sources
 * can be cleanly presented on top of the output.
 */
export function extractSources(
  text: string = '',
  toolCalls?: any[],
  explicitSources?: any[]
): {
  sources: ChatSourceItem[];
  cleanText: string;
} {
  const seenUrls = new Set<string>();
  const sources: ChatSourceItem[] = [];

  const addSource = (rawUrl: string, title?: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim().replace(/[.,;)]+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;
    // Normalize url
    const cleanUrl = trimmed;
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);

    const domain = getCleanDomain(cleanUrl);
    const finalTitle = getSourceTitle(cleanUrl, title);
    sources.push({
      title: finalTitle,
      url: cleanUrl,
      domain,
    });
  };

  // 1. Process explicit sources (e.g. from server grounding / citations)
  if (Array.isArray(explicitSources)) {
    for (const item of explicitSources) {
      const url = item?.url || item?.uri || item?.link;
      const title = item?.title || item?.name || item?.label;
      if (url) addSource(url, title);
    }
  }

  // 2. Process tool calls (e.g. web_search, browse, fetch_url, computer_navigate)
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls) {
      const args = tc.arguments || tc.args;
      const res = tc.result;
      if (args) {
        const u = args.url || args.uri || (typeof args === 'string' && args.startsWith('http') ? args : undefined);
        if (u) addSource(u, args.title || args.query);
      }
      if (res) {
        if (typeof res === 'object') {
          if (res.url) addSource(res.url, res.title);
          if (Array.isArray(res.sources)) {
            res.sources.forEach((s: any) => {
              const u = typeof s === 'string' ? s : s?.url || s?.uri;
              if (u) addSource(u, s?.title);
            });
          }
          if (Array.isArray(res.results)) {
            res.results.forEach((r: any) => {
              const u = r?.url || r?.link || r?.uri;
              if (u) addSource(u, r?.title);
            });
          }
        }
      }
    }
  }

  // 3. Process text for citations, markdown links, or "Sources:" / "References:" sections
  let cleanText = text;
  if (typeof text === 'string' && text.trim().length > 0) {
    // Check for a dedicated Sources / References block at the end of the message
    const sourcesBlockRegex = /\n\s*(?:###?\s*|\*{1,2})?(?:Sources|References|Citations|Online Sources):?\*{0,2}\s*\n([\s\S]*)$/i;
    const matchSourcesBlock = cleanText.match(sourcesBlockRegex);

    if (matchSourcesBlock) {
      const blockContent = matchSourcesBlock[1];
      // Extract markdown links inside the block: [Title](https://...)
      const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
      let mdMatch: RegExpExecArray | null;
      while ((mdMatch = mdLinkRegex.exec(blockContent)) !== null) {
        addSource(mdMatch[2], mdMatch[1]);
      }

      // Extract bare URLs inside the block: https://...
      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      let urlMatch: RegExpExecArray | null;
      while ((urlMatch = urlRegex.exec(blockContent)) !== null) {
        addSource(urlMatch[1]);
      }

      // Strip the trailing sources section from the clean text
      cleanText = cleanText.slice(0, matchSourcesBlock.index).trimEnd();
    }

    // Also scan remaining text for inline citation links: [1](https://...), [Source](https://...)
    const inlineCitationRegex = /\[(?:(?:source|ref|citation|\d+)|([^\]]{2,25}))\]\((https?:\/\/[^\s\)]+)\)/gi;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineCitationRegex.exec(cleanText)) !== null) {
      addSource(inlineMatch[2], inlineMatch[1] || undefined);
    }

    // Footnote patterns: [1]: https://...
    const footnoteRegex = /\[\d+\]:\s*(https?:\/\/[^\s\)]+)/gi;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = footnoteRegex.exec(cleanText)) !== null) {
      addSource(fnMatch[1]);
    }
  }

  return { sources, cleanText };
}
