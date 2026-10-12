/**
 * Lightweight regex-based code tokenizer for chat/tool-output code blocks.
 * No native dependency (e.g. highlight.js) — a hand-rolled tokenizer keeps
 * this consistent with the rest of MarkdownRenderer and avoids bundle-size
 * cost for a feature used only to color a handful of tokens per block.
 */

export type TokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'type'
  | 'tag';

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS: Record<string, string[]> = {
  js: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'new',
    'this', 'super', 'import', 'export', 'default', 'from', 'as', 'try',
    'catch', 'finally', 'throw', 'async', 'await', 'typeof', 'instanceof',
    'in', 'of', 'yield', 'static', 'get', 'set', 'true', 'false', 'null',
    'undefined', 'void', 'delete', 'interface', 'type', 'enum', 'implements',
    'public', 'private', 'protected', 'readonly', 'namespace', 'declare',
  ],
  python: [
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
    'continue', 'class', 'import', 'from', 'as', 'try', 'except', 'finally',
    'raise', 'with', 'yield', 'lambda', 'pass', 'None', 'True', 'False',
    'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal', 'async', 'await',
    'self', 'assert', 'del',
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case',
    'esac', 'function', 'return', 'export', 'local', 'readonly', 'in',
    'break', 'continue', 'echo', 'set',
  ],
  go: [
    'func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break',
    'continue', 'package', 'import', 'var', 'const', 'type', 'struct',
    'interface', 'map', 'chan', 'go', 'defer', 'select', 'default', 'nil',
    'true', 'false', 'fallthrough',
  ],
  rust: [
    'fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'loop',
    'match', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'pub',
    'use', 'mod', 'crate', 'self', 'super', 'as', 'where', 'move', 'async',
    'await', 'true', 'false', 'None', 'Some', 'Ok', 'Err',
  ],
  java: [
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface',
    'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'try',
    'catch', 'finally', 'throw', 'throws', 'import', 'package', 'void',
    'true', 'false', 'null', 'enum', 'abstract', 'synchronized',
  ],
  c: [
    'int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned',
    'signed', 'struct', 'union', 'enum', 'typedef', 'return', 'if', 'else',
    'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'static',
    'const', 'extern', 'sizeof', 'goto', 'default', 'namespace', 'class',
    'public', 'private', 'protected', 'template', 'new', 'delete', 'this',
    'true', 'false', 'nullptr',
  ],
  sql: [
    'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
    'delete', 'create', 'table', 'alter', 'drop', 'join', 'inner', 'left',
    'right', 'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'as',
    'and', 'or', 'not', 'null', 'is', 'in', 'like', 'distinct', 'union',
    'primary', 'key', 'foreign', 'references', 'index',
  ],
  yaml: [],
  css: [],
  html: [],
};

/** Maps a fenced-code-block language tag to one of the keyword sets above. */
function languageFamily(language: string): keyof typeof KEYWORDS | null {
  const lang = language.toLowerCase().trim();
  if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'json'].includes(lang)) return 'js';
  if (['py', 'python'].includes(lang)) return 'python';
  if (['sh', 'bash', 'shell', 'zsh', 'console'].includes(lang)) return 'bash';
  if (lang === 'go' || lang === 'golang') return 'go';
  if (lang === 'rust' || lang === 'rs') return 'rust';
  if (lang === 'java' || lang === 'kotlin' || lang === 'kt') return 'java';
  if (['c', 'cpp', 'c++', 'h', 'hpp', 'cs', 'csharp'].includes(lang)) return 'c';
  if (lang === 'sql') return 'sql';
  if (['yaml', 'yml'].includes(lang)) return 'yaml';
  if (lang === 'css' || lang === 'scss' || lang === 'less') return 'css';
  if (lang === 'html' || lang === 'xml') return 'html';
  return null;
}

/** Whether `tokenize` can meaningfully colorize this language. */
export function isHighlightable(language: string): boolean {
  return languageFamily(language) !== null;
}

const STRING_RE = /(^|[^\\])(["'`])(?:\\.|(?!\2)[^\\])*\2/;
const NUMBER_RE = /\b0x[0-9a-fA-F]+\b|\b\d+(\.\d+)?([eE][+-]?\d+)?\b/;
const LINE_COMMENT_RE = /\/\/.*$|#.*$/;
const FUNCTION_CALL_RE = /\b([A-Za-z_$][\w$]*)(?=\()/;
const TAG_RE = /<\/?[A-Za-z][\w-]*|\/?>/;

/** Tokenizes one line of code for the given language family. */
function tokenizeLine(line: string, family: keyof typeof KEYWORDS): Token[] {
  if (family === 'html') {
    return tokenizeGeneric(line, [], TAG_RE, 'tag');
  }

  const keywords = KEYWORDS[family] || [];
  const tokens: Token[] = [];
  let rest = line;
  let offset = 0;

  while (rest.length > 0) {
    const commentMatch = family !== 'css' ? LINE_COMMENT_RE.exec(rest) : null;
    const stringMatch = STRING_RE.exec(rest);
    const numberMatch = NUMBER_RE.exec(rest);

    const candidates = [
      commentMatch && { index: commentMatch.index, length: commentMatch[0].length, kind: 'comment' as const },
      stringMatch && {
        index: stringMatch.index + (stringMatch[1]?.length || 0),
        length: stringMatch[0].length - (stringMatch[1]?.length || 0),
        kind: 'string' as const,
      },
    ].filter(Boolean) as { index: number; length: number; kind: TokenKind }[];

    // Comments always win from their start index onward (rest of line).
    const comment = candidates.find(c => c.kind === 'comment');
    const next = comment || candidates.sort((a, b) => a.index - b.index)[0];

    if (!next) {
      tokenizeWordsInto(rest, offset, keywords, numberMatch, tokens);
      break;
    }

    if (next.index > 0) {
      tokenizeWordsInto(rest.slice(0, next.index), offset, keywords, NUMBER_RE.exec(rest.slice(0, next.index)), tokens);
    }

    const chunkEnd = next.kind === 'comment' ? rest.length : next.index + next.length;
    tokens.push({ text: rest.slice(next.index, chunkEnd), kind: next.kind });
    offset += chunkEnd;
    rest = rest.slice(chunkEnd);
  }

  return tokens;
}

function tokenizeWordsInto(
  segment: string,
  _offset: number,
  keywords: string[],
  _numberMatch: RegExpExecArray | null,
  out: Token[]
) {
  const wordRe = /[A-Za-z_$][\w$]*|0x[0-9a-fA-F]+|\d+(\.\d+)?([eE][+-]?\d+)?|\s+|./g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(segment)) !== null) {
    const chunk = m[0];
    if (/^\s+$/.test(chunk)) {
      out.push({ text: chunk, kind: 'plain' });
    } else if (keywords.includes(chunk)) {
      out.push({ text: chunk, kind: 'keyword' });
    } else if (/^(0x[0-9a-fA-F]+|\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(chunk)) {
      out.push({ text: chunk, kind: 'number' });
    } else if (segment.slice(m.index + chunk.length, m.index + chunk.length + 1) === '(' && /^[A-Za-z_$]/.test(chunk)) {
      out.push({ text: chunk, kind: 'function' });
    } else {
      out.push({ text: chunk, kind: 'plain' });
    }
  }
}

function tokenizeGeneric(line: string, _keywords: string[], re: RegExp, kind: TokenKind): Token[] {
  const tokens: Token[] = [];
  let rest = line;
  while (rest.length > 0) {
    const match = re.exec(rest);
    if (!match) {
      tokens.push({ text: rest, kind: 'plain' });
      break;
    }
    if (match.index > 0) {
      tokens.push({ text: rest.slice(0, match.index), kind: 'plain' });
    }
    tokens.push({ text: match[0], kind });
    rest = rest.slice(match.index + match[0].length);
  }
  return tokens;
}

/** Tokenizes a full code block, one Token[] per line. Returns null if unsupported. */
export function tokenizeCode(code: string, language: string): Token[][] | null {
  const family = languageFamily(language);
  if (!family) return null;
  try {
    return code.split('\n').map(line => tokenizeLine(line, family));
  } catch {
    return null;
  }
}

export interface SyntaxColors {
  plain: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  type: string;
  tag: string;
}

export function syntaxColorsForTheme(isDark: boolean): SyntaxColors {
  return isDark
    ? {
        plain: '#d4d4d4',
        keyword: '#c586c0',
        string: '#ce9178',
        comment: '#6a9955',
        number: '#b5cea8',
        function: '#dcdcaa',
        type: '#4ec9b0',
        tag: '#569cd6',
      }
    : {
        plain: '#1f2328',
        keyword: '#a626a4',
        string: '#50a14f',
        comment: '#a0a1a7',
        number: '#986801',
        function: '#4078f2',
        type: '#0184bc',
        tag: '#e45649',
      };
}
