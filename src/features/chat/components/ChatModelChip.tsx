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
      <Text style={[styles.label, { color: theme.textPrimary }]}>
        {label}
      </Text>
      <ChevronDownIcon size={14} color={theme.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
