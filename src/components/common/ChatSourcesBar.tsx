import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowUpRightIcon, GlobeIcon } from './Icons';
import { ThemeColors } from '../../theme/theme';
import { ChatSourceItem } from '../../utils/sourceExtractor';

interface ChatSourcesBarProps {
  sources: ChatSourceItem[];
  theme: ThemeColors;
  isDark?: boolean;
}

export function ChatSourcesBar({ sources, theme, isDark = true }: ChatSourcesBarProps) {
  if (!sources || sources.length === 0) return null;

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handlePressSource = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <GlobeIcon size={14} color={isDark ? '#35D6B4' : '#2D7543'} />
        <Text style={[styles.headerTitle, { color: theme.textSecondary, fontFamily: monoFont }]}>
          Sources ({sources.length})
        </Text>
      </View>

      {/* Horizontal list of source chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {sources.map((item, index) => {
          const domainInitial = (item.domain.charAt(0) || 'W').toUpperCase();
          return (
            <TouchableOpacity
              key={`${item.url}-${index}`}
              activeOpacity={0.7}
              onPress={() => handlePressSource(item.url)}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: theme.border,
                },
              ]}>
              <View
                style={[
                  styles.initialBadge,
                  {
                    backgroundColor: isDark ? '#1C271E' : '#E0F3E5',
                  },
                ]}>
                <Text
                  style={[
                    styles.initialText,
                    {
                      color: isDark ? '#94C7A0' : '#2D7543',
                      fontFamily: monoFont,
                    },
                  ]}>
                  {domainInitial}
                </Text>
              </View>

              <View style={styles.textColumn}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.sourceTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.sourceDomain, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {item.domain}
                </Text>
              </View>

              <ArrowUpRightIcon size={12} color={theme.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 220,
  },
  initialBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textColumn: {
    flexShrink: 1,
    marginRight: 2,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  sourceDomain: {
    fontSize: 10.5,
    marginTop: 1,
  },
});

