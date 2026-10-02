/**
 * Turns remote-session entries into what the feed renders: consecutive tool
 * calls collapse into one "Ran 2 commands" group, like Claude Code.
 */

import type { RemoteEntry, ToolCall } from './protocol';

export type ToolEntry = Extract<RemoteEntry, { kind: 'tool' }>;

export type FeedItem =
  | Exclude<RemoteEntry, ToolEntry>
  | { kind: 'tools'; id: string; tools: ToolEntry[] };

export function buildFeed(entries: RemoteEntry[]): FeedItem[] {
  const feed: FeedItem[] = [];
  if (!Array.isArray(entries)) return feed;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    if (entry.kind === 'tool') {
      const last = feed[feed.length - 1];
      if (last?.kind === 'tools') {
        feed[feed.length - 1] = { ...last, tools: [...last.tools, entry] };
      } else {
        feed.push({
          kind: 'tools',
          id: `group_${entry.id || i}`,
          tools: [entry],
        });
      }
    } else {
      feed.push(entry);
    }
  }
  return feed;
}

type ToolKind = 'command' | 'read' | 'edit' | 'search' | 'fetch' | 'other';

export function toolKind(name?: string | null): ToolKind {
  const n = (name || '').toLowerCase();
  if (
    [
      'bash',
      'terminal',
      'exec',
      'run_command',
      'shell',
      'command',
      'execute_command',
    ].includes(n) ||
    n.includes('bash') ||
    n.includes('command') ||
    n.includes('terminal')
  ) {
    return 'command';
  }
  if (
    [
      'read',
      'readfile',
      'read_file',
      'view_file',
      'notebookread',
      'view',
      'fileread',
    ].includes(n) ||
    (n.includes('read') && !n.includes('thread'))
  ) {
    return 'read';
  }
  if (
    [
      'edit',
      'write',
      'multiedit',
      'writefile',
      'write_file',
      'write_to_file',
      'replace_file_content',
      'notebookedit',
      'filewrite',
      'fileedit',
    ].includes(n) ||
    n.includes('write') ||
    n.includes('edit')
  ) {
    return 'edit';
  }
  if (
    ['grep', 'glob', 'search', 'find', 'ls', 'list_dir'].includes(n) ||
    n.includes('search') ||
    n.includes('grep') ||
    n.includes('glob')
  ) {
    return 'search';
  }
  if (
    [
      'fetch',
      'webfetch',
      'web_fetch',
      'curl',
      'http',
      'read_url_content',
    ].includes(n) ||
    n.includes('fetch')
  ) {
    return 'fetch';
  }
  return 'other';
}

const basename = (path: string) =>
  path.split('/').filter(Boolean).pop() || path;

/** One-line label for a single tool call, e.g. the command or file name. */
export function describeTool(tool: ToolCall): string {
  try {
    if (!tool) return 'Tool';
    const name = tool.name || 'Tool';
    const input =
      tool.input && typeof tool.input === 'object' ? tool.input : {};
    switch (toolKind(name)) {
      case 'command':
        return String(
          input.command ||
            input.cmd ||
            input.CommandLine ||
            input.commandLine ||
            input.description ||
            name,
        );
      case 'read':
        return `Read ${basename(
          String(
            input.file_path ||
              input.path ||
              input.notebook_path ||
              input.file ||
              input.filename ||
              input.target_file ||
              input.targetFile ||
              '',
          ),
        )}`.trim();
      case 'edit':
        return `${name.toLowerCase().includes('write') ? 'Write' : 'Edit'} ${basename(
          String(
            input.file_path ||
              input.path ||
              input.notebook_path ||
              input.file ||
              input.filename ||
              input.target_file ||
              input.targetFile ||
              '',
          ),
        )}`.trim();
      case 'search':
        return `${name} ${String(
          input.pattern || input.query || input.path || '',
        )}`.trim();
      case 'fetch':
        return `Fetch ${String(
          input.url || input.uri || input.href || '',
        )}`.trim();
      default: {
        const firstString = Object.values(input).find(
          v => typeof v === 'string',
        );
        return firstString ? `${name} ${String(firstString)}` : name;
      }
    }
  } catch {
    return tool?.name || 'Tool';
  }
}

/** The text shown after `$` in the tool detail sheet. */
export function toolCommand(tool: ToolCall): string {
  try {
    if (!tool) return '';
    const input =
      tool.input && typeof tool.input === 'object' ? tool.input : {};
    if (toolKind(tool.name) === 'command' && input.command)
      return String(input.command);
    return JSON.stringify(input, null, 2);
  } catch {
    return '';
  }
}

/** Claude Code-style summary for a run of consecutive tool calls. */
export function summarizeTools(tools: ToolCall[]): string {
  try {
    if (!Array.isArray(tools) || tools.length === 0) return 'Used tools';
    const count = tools.length;
    const kinds = new Set(tools.map(t => toolKind(t?.name)));
    const only = kinds.size === 1 ? [...kinds][0] : null;
    if (only === 'command')
      return count === 1 ? 'Ran a command' : `Ran ${count} commands`;
    if (only === 'read')
      return count === 1 ? 'Read a file' : `Read ${count} files`;
    if (only === 'edit')
      return count === 1 ? 'Edited a file' : `Edited ${count} files`;
    if (only === 'search')
      return count === 1 ? 'Searched the code' : `Ran ${count} searches`;
    return count === 1 ? describeTool(tools[0]) : `Used ${count} tools`;
  } catch {
    return 'Used tools';
  }
}
