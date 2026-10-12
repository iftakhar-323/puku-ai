/**
 * Extracts fenced code blocks from a markdown string so they can be
 * auto-persisted as Artifacts, mirroring the Flutter app's
 * `fenced_code_block_parser.dart` + `_artifactTitleForLanguage`.
 */

export interface FencedCodeBlock {
  language: string;
  code: string;
}

const ACRONYM_LANGUAGES = new Set(['html', 'css', 'js', 'json', 'xml', 'sql', 'php']);

export function extractFencedCodeBlocks(markdown: string): FencedCodeBlock[] {
  if (!markdown) return [];
  const blocks: FencedCodeBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      if (language) {
        blocks.push({ language, code: codeLines.join('\n') });
      }
      continue;
    }
    i++;
  }

  return blocks;
}

export function titleForLanguage(language: string): string {
  const normalized = language.toLowerCase();
  const label = ACRONYM_LANGUAGES.has(normalized)
    ? normalized.toUpperCase()
    : normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return `${label} artifact`;
}
