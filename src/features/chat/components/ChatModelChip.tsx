import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ChevronDownIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatModelChipProps {
  label: string;
  theme: ThemeColors;
  onTap: () => void;
}

export function ChatModelChip({ label, theme, onTap }: ChatModelChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onTap}
      style={[styles.container, { backgroundColor: theme.pillBackground }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <ChevronDownIcon size={14} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
