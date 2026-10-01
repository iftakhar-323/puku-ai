import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckmarkIcon, CloseIcon, TerminalWindowIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import type { ToolCall } from '../relay/protocol';
import { describeTool, toolCommand } from '../relay/feed';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Props {
  tool: ToolCall | null;
  theme: ThemeColors;
  onClose: () => void;
}

/** Bottom sheet with a tool call's input and real output/status. */
export function ToolDetailSheet({ tool, theme, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const statusColor =
    tool?.status === 'error' ? theme.error : tool?.status === 'success' ? theme.success : theme.textMuted;
  const statusLabel =
    tool?.status === 'error' ? 'Failed' : tool?.status === 'success' ? 'Success' : 'Running';

  return (
    <Modal visible={!!tool} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.secondaryBackground,
              paddingBottom: Math.max(insets.bottom + 12, 28),
            },
          ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{tool?.name || 'Tool'}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              accessibilityLabel="Close tool details"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeBtn, { backgroundColor: theme.pillBackground }]}>
              <CloseIcon size={14} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.cardBackground }]}>
              <TerminalWindowIcon size={20} color={theme.accent} />
            </View>
            <Text numberOfLines={1} style={[styles.summary, { color: theme.textPrimary }]}>
              {tool ? describeTool(tool) : ''}
            </Text>
          </View>

          <View style={[styles.box, { backgroundColor: theme.codeBackground }]}>
            <ScrollView nestedScrollEnabled style={styles.inputScroll}>
              <Text selectable style={[styles.mono, { color: theme.textPrimary }]}>
                <Text style={{ color: theme.accent }}>$ </Text>
                {tool ? toolCommand(tool) : ''}
              </Text>
            </ScrollView>
          </View>

          <View style={styles.outputHeader}>
            <Text style={[styles.outputLabel, { color: theme.textMuted }]}>OUTPUT</Text>
            <View style={styles.status}>
              {tool?.status === 'running' ? (
                <ActivityIndicator size="small" color={statusColor} />
              ) : tool?.status === 'success' ? (
                <CheckmarkIcon size={12} color={statusColor} />
              ) : (
                <CloseIcon size={11} color={statusColor} />
              )}
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={[styles.box, styles.outputBox, { backgroundColor: theme.codeBackground }]}>
            <ScrollView nestedScrollEnabled>
              <Text selectable style={[styles.mono, { color: theme.textPrimary }]}>
                {tool?.output?.trim() ||
                  (tool?.status === 'running' ? 'Waiting for output…' : 'No output.')}
              </Text>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
    fontFamily: monoFont,
  },
  box: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inputScroll: {
    maxHeight: 140,
  },
  outputBox: {
    maxHeight: 280,
    minHeight: 80,
  },
  mono: {
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 19,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  outputLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
