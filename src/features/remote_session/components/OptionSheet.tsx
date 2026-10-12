import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckmarkIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

export interface SheetOption {
  key: string;
  label: string;
  description?: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedKey?: string;
  theme: ThemeColors;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** Bottom sheet with a single-choice list (permission mode, model). */
export function OptionSheet({
  visible,
  title,
  options,
  selectedKey,
  theme,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.cardBackground,
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.outline }]} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {options.map(option => {
            const selected = option.key === selectedKey;
            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option.key)}
                style={[styles.row, { borderBottomColor: theme.outline }]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text
                      style={[styles.description, { color: theme.textMuted }]}
                    >
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {selected && (
                  <CheckmarkIcon size={16} color={theme.textPrimary} />
                )}
              </TouchableOpacity>
            );
          })}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 12.5,
    marginTop: 2,
  },
});
