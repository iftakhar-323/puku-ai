import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../theme/theme';
import { MarkdownRenderer } from '../../features/chat/components/MarkdownRenderer';

/**
 * Renders a raw text blob — JSON, pseudo-XML tags, `key: value` lines, or
 * prose — as formatted UI instead of ever showing the raw syntax.
 *
 * Tool/skill results arrive in whatever shape the underlying tool happens to
 * emit; this is the single place that decides how to present any of them, so
 * new tools don't need a bespoke renderer to avoid dumping raw JSON/XML on
 * screen. Ported from the Flutter app's `lib/widgets/smart_output_view.dart`.
 */
export function SmartOutputView({
  data,
  theme,
  monoFont,
}: {
  data: string;
  theme: ThemeColors;
  monoFont: string;
}) {
  const trimmed = (data || '').trim();
  if (!trimmed) return null;

  const json = tryJsonView(trimmed, theme, monoFont);
  if (json) return json;

  const xml = tryXmlTaggedView(trimmed, theme, monoFont);
  if (xml) return xml;

  const kv = tryKeyValueView(trimmed, theme, monoFont);
  if (kv) return kv;

  return <MarkdownRenderer content={stripBareHashNumbers(trimmed)} theme={theme} />;
}

// `#` immediately followed by a digit (e.g. "task #3") is never valid ATX
// heading syntax (that requires a space after the `#`) — it's always a plain
// reference number, so it's safe to drop the `#` unconditionally.
function stripBareHashNumbers(text: string): string {
  return text.replace(/#(?=\d)/g, '');
}

function humanizeLabel(raw: string): string {
  return raw
    .split(/[_ ]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const CODE_LIKE_LABELS = [
  'output',
  'stdout',
  'stderr',
  'log',
  'diff',
  'code',
  'command',
  'stack trace',
  'trace',
];

function looksLikeCode(label: string, value: string): boolean {
  const normalized = label.toLowerCase();
  return CODE_LIKE_LABELS.some(l => normalized.includes(l)) && value.length > 0;
}

function statusColor(value: string, theme: ThemeColors): string | null {
  const normalized = value.toLowerCase();
  if (
    normalized.includes('complet') ||
    normalized.includes('done') ||
    normalized.includes('success')
  ) {
    return theme.success;
  }
  if (normalized.includes('progress') || normalized.includes('running')) {
    return theme.accent;
  }
  if (
    normalized.includes('fail') ||
    normalized.includes('error') ||
    normalized.includes('block')
  ) {
    return theme.error;
  }
  return null;
}

function FieldLabel({ label, theme }: { label: string; theme: ThemeColors }) {
  return (
    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
  );
}

function MonospaceBlock({
  text,
  theme,
  monoFont,
}: {
  text: string;
  theme: ThemeColors;
  monoFont: string;
}) {
  return (
    <View style={[styles.monoBlock, { backgroundColor: theme.codeBackground }]}>
      <Text selectable style={[styles.monoText, { color: theme.textPrimary, fontFamily: monoFont }]}>
        {text}
      </Text>
    </View>
  );
}

function KeyValueLine({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeColors;
}) {
  const normalizedLabel = label.toLowerCase();
  const valueColor = normalizedLabel.includes('status')
    ? statusColor(value, theme)
    : normalizedLabel === 'exit code'
    ? value.trim() === '0'
      ? theme.success
      : theme.error
    : null;

  return (
    <Text style={[styles.kvLine, { color: theme.textPrimary }]}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}: </Text>
      <Text style={valueColor ? { color: valueColor, fontWeight: '600' } : undefined}>
        {stripBareHashNumbers(value)}
      </Text>
    </Text>
  );
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function JsonField({
  label,
  value,
  theme,
  monoFont,
}: {
  label: string;
  value: JsonValue;
  theme: ThemeColors;
  monoFont: string;
}) {
  if (value !== null && typeof value === 'object') {
    return (
      <View style={styles.fieldGroup}>
        <FieldLabel label={label} theme={theme} />
        <View style={styles.nestedIndent}>
          <JsonNode node={value} theme={theme} monoFont={monoFont} />
        </View>
      </View>
    );
  }

  const valueText = value === null ? 'null' : String(value);
  if (looksLikeCode(label, valueText)) {
    return (
      <View style={styles.fieldGroup}>
        <FieldLabel label={label} theme={theme} />
        <MonospaceBlock text={valueText} theme={theme} monoFont={monoFont} />
      </View>
    );
  }
  if (valueText.includes('\n') || valueText.length > 60) {
    return (
      <View style={styles.fieldGroup}>
        <FieldLabel label={label} theme={theme} />
        <MarkdownRenderer content={stripBareHashNumbers(valueText)} theme={theme} />
      </View>
    );
  }

  return <KeyValueLine label={label} value={valueText} theme={theme} />;
}

function JsonNode({
  node,
  theme,
  monoFont,
}: {
  node: JsonValue;
  theme: ThemeColors;
  monoFont: string;
}) {
  if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
    const entries = Object.entries(node);
    return (
      <View style={styles.nodeColumn}>
        {entries.map(([key, val], idx) => (
          <View key={key} style={idx > 0 ? styles.nodeSpacing : undefined}>
            <JsonField label={humanizeLabel(key)} value={val} theme={theme} monoFont={monoFont} />
          </View>
        ))}
      </View>
    );
  }
  if (Array.isArray(node)) {
    return (
      <View style={styles.nodeColumn}>
        {node.map((item, idx) => (
          <View key={idx} style={idx > 0 ? styles.nodeSpacing : undefined}>
            <JsonField label={`#${idx + 1}`} value={item} theme={theme} monoFont={monoFont} />
          </View>
        ))}
      </View>
    );
  }
  return <MarkdownRenderer content={String(node)} theme={theme} />;
}

function tryJsonView(text: string, theme: ThemeColors, monoFont: string) {
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    return null;
  }
  if (decoded === null || typeof decoded !== 'object') return null;
  return <JsonNode node={decoded as JsonValue} theme={theme} monoFont={monoFont} />;
}

const XML_TAG_RE = /<([a-zA-Z_]\w*)>([\s\S]*?)<\/\1>/g;

function tryXmlTaggedView(text: string, theme: ThemeColors, monoFont: string) {
  const matches = Array.from(text.matchAll(XML_TAG_RE));
  if (matches.length < 2) return null;

  const matchedLength = matches.reduce((sum, m) => sum + m[0].length, 0);
  if (matchedLength < text.length * 0.5) return null;

  return (
    <View style={styles.nodeColumn}>
      {matches.map((m, idx) => (
        <View key={idx} style={idx > 0 ? styles.nodeSpacing : undefined}>
          <JsonField
            label={humanizeLabel(m[1])}
            value={m[2].trim()}
            theme={theme}
            monoFont={monoFont}
          />
        </View>
      ))}
    </View>
  );
}

const KEY_VALUE_LINE_RE = /^([A-Za-z][A-Za-z0-9 _#()/-]{0,40}):\s*(.*)$/;

function tryKeyValueView(text: string, theme: ThemeColors, _monoFont: string) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const matches = lines.map(l => l.match(KEY_VALUE_LINE_RE));
  if (matches.some(m => !m)) return null;

  return (
    <View style={styles.nodeColumn}>
      {matches.map((m, idx) => (
        <View key={idx} style={idx > 0 ? styles.nodeSpacing : undefined}>
          <KeyValueLine label={m![1].trim()} value={m![2].trim()} theme={theme} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nodeColumn: {
    width: '100%',
  },
  nodeSpacing: {
    marginTop: 6,
  },
  fieldGroup: {
    gap: 3,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  nestedIndent: {
    paddingLeft: 10,
  },
  kvLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  monoBlock: {
    borderRadius: 8,
    padding: 10,
  },
  monoText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
