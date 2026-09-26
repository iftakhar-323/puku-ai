import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ThemeColors } from '../../../theme/theme';

interface MarkdownRendererProps {
  content: string;
  theme: ThemeColors;
}

export function renderFormattedText(
  text: string,
  baseStyle: any,
  theme: ThemeColors
) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={lastIndex} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      parts.push(
        <Text
          key={match.index}
          style={[baseStyle, { fontWeight: '700', color: theme.textPrimary }]}>
          {chunk.slice(2, -2)}
        </Text>
      );
    } else if (chunk.startsWith('*') && chunk.endsWith('*')) {
      parts.push(
        <Text key={match.index} style={[baseStyle, { fontStyle: 'italic' }]}>
          {chunk.slice(1, -1)}
        </Text>
      );
    } else if (chunk.startsWith('`') && chunk.endsWith('`')) {
      parts.push(
        <Text
          key={match.index}
          style={[
            baseStyle,
            {
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              backgroundColor: theme.codeBackground,
              paddingHorizontal: 4,
              borderRadius: 4,
            },
          ]}>
          {chunk.slice(1, -1)}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={lastIndex} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts;
}

export function MarkdownRenderer({ content, theme }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block Fence (```)
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <View
          key={`code_${i}`}
          style={[
            styles.codeBlock,
            {
              backgroundColor: theme.codeBackground,
              borderColor: theme.outline,
            },
          ]}>
          <Text
            style={[
              styles.codeText,
              { color: theme.textPrimary },
            ]}>
            {codeLines.join('\n')}
          </Text>
        </View>
      );
      continue;
    }

    // 2. Table Block (| ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line
            .split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        const headerCells = parseRow(tableLines[0]);
        const isSep = tableLines[1].replace(/[-| :]/g, '').length === 0;
        const dataLines = isSep ? tableLines.slice(2) : tableLines.slice(1);

        elements.push(
          <ScrollView
            key={`table_${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tableScroll}>
            <View
              style={[
                styles.tableContainer,
                { borderColor: theme.outline },
              ]}>
              {/* Header Row */}
              <View
                style={[
                  styles.tableRow,
                  styles.tableHeaderRow,
                  { backgroundColor: theme.chatBarBackground, borderColor: theme.outline },
                ]}>
                {headerCells.map((cell, cIdx) => (
                  <View
                    key={`th_${cIdx}`}
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      { borderColor: theme.outline },
                    ]}>
                    <Text
                      style={[
                        styles.tableHeaderCellText,
                        { color: theme.textPrimary },
                      ]}>
                      {renderFormattedText(cell, styles.tableHeaderCellText, theme)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Data Rows */}
              {dataLines.map((rowLine, rIdx) => {
                const cells = parseRow(rowLine);
                return (
                  <View
                    key={`tr_${rIdx}`}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor:
                          rIdx % 2 === 0 ? 'transparent' : theme.chatBarBackground,
                        borderColor: theme.outline,
                      },
                    ]}>
                    {cells.map((cell, cIdx) => (
                      <View
                        key={`td_${cIdx}`}
                        style={[
                          styles.tableCell,
                          { borderColor: theme.outline },
                        ]}>
                        <Text
                          style={[
                            styles.tableCellText,
                            { color: theme.textPrimary },
                          ]}>
                          {renderFormattedText(cell, styles.tableCellText, theme)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        );
        continue;
      }
    }

    // 3. Headings
    if (trimmed.startsWith('#')) {
      const levelMatch = trimmed.match(/^#+/);
      const level = levelMatch ? levelMatch[0].length : 1;
      const headingText = trimmed.replace(/^#+\s*/, '');
      const fontSize = level === 1 ? 20 : level === 2 ? 18 : 16;
      elements.push(
        <Text
          key={`h_${i}`}
          style={[
            styles.heading,
            {
              fontSize,
              color: theme.textPrimary,
              marginTop: 12,
              marginBottom: 4,
            },
          ]}>
          {renderFormattedText(
            headingText,
            [styles.heading, { fontSize, color: theme.textPrimary }],
            theme
          )}
        </Text>
      );
      i++;
      continue;
    }

    // 4. Bullet Points (• , - , * )
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.*)/);
    if (bulletMatch) {
      const itemContent = bulletMatch[2];
      elements.push(
        <View key={`b_${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: theme.textPrimary }]}>
            •{' '}
          </Text>
          <Text style={[styles.bulletContent, { color: theme.textPrimary }]}>
            {renderFormattedText(
              itemContent,
              [styles.bulletContent, { color: theme.textPrimary }],
              theme
            )}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // 5. Numbered Lists (1. , 2. )
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberMatch) {
      const prefix = numberMatch[1] + '. ';
      const itemContent = numberMatch[2];
      elements.push(
        <View key={`num_${i}`} style={styles.bulletRow}>
          <Text
            style={[
              styles.numberPrefix,
              { color: theme.textPrimary },
            ]}>
            {prefix}
          </Text>
          <Text style={[styles.bulletContent, { color: theme.textPrimary }]}>
            {renderFormattedText(
              itemContent,
              [styles.bulletContent, { color: theme.textPrimary }],
              theme
            )}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // 6. Empty Line
    if (trimmed === '') {
      elements.push(<View key={`empty_${i}`} style={styles.emptyLine} />);
      i++;
      continue;
    }

    // 7. Regular Paragraph
    elements.push(
      <Text
        key={`p_${i}`}
        style={[styles.paragraph, { color: theme.textPrimary }]}>
        {renderFormattedText(
          rawLine,
          [styles.paragraph, { color: theme.textPrimary }],
          theme
        )}
      </Text>
    );
    i++;
  }

  return <View style={styles.container}>{elements}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
    marginVertical: 2,
  },
  heading: {
    fontWeight: '700',
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  numberPrefix: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  bulletContent: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  emptyLine: {
    height: 8,
  },
  codeBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  tableScroll: {
    marginVertical: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {},
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    minWidth: 110,
    justifyContent: 'center',
  },
  tableHeaderCell: {},
  tableHeaderCellText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
