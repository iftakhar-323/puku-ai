import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckmarkIcon,
  ChevronRightIcon,
  CloseIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ChatModelType } from '../../../types';

interface ChatModelSelectionSheetProps {
  visible: boolean;
  selectedModel: ChatModelType;
  theme: ThemeColors;
  onClose: () => void;
  onSelectModel: (model: ChatModelType) => void;
  onEffortTap?: () => void;
  onMoreModelsTap?: () => void;
}

export function ChatModelSelectionSheet({
  visible,
  selectedModel,
  theme,
  onClose,
  onSelectModel,
  onEffortTap,
  onMoreModelsTap,
}: ChatModelSelectionSheetProps) {
  const insets = useSafeAreaInsets();

  const options: Array<{
    id: ChatModelType;
    title: string;
    description: string;
  }> = [
    {
      id: 'opus-4.8',
      title: 'Opus 4.8',
      description: 'For complex tasks',
    },
    {
      id: 'puku-ai-2.8',
      title: 'puku-ai-2.8',
      description: 'Most efficient for everyday tasks',
    },
    {
      id: 'puku-ai-2.7',
      title: 'puku-ai-2.7',
      description: 'Fastest for quick answers',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.secondaryBackground,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Select Model
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.closeBtn}>
            <CloseIcon size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Options */}
        {options.map((opt, index) => {
          const isSelected = selectedModel === opt.id;
          return (
            <React.Fragment key={opt.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onSelectModel(opt.id);
                  onClose();
                }}
                style={styles.optionRow}>
                <View style={styles.optionTextCol}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: isSelected ? theme.blue : theme.textPrimary },
                    ]}>
                    {opt.title}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: isSelected ? theme.blueLite : theme.textMuted },
                    ]}>
                    {opt.description}
                  </Text>
                </View>
                {isSelected && (
                  <CheckmarkIcon size={20} color={theme.blueLite} />
                )}
              </TouchableOpacity>
              <View
                style={[styles.divider, { backgroundColor: theme.outline }]}
              />
            </React.Fragment>
          );
        })}

        {/* Effort Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEffortTap}
          style={styles.effortRow}>
          <Text style={[styles.effortTitle, { color: theme.textPrimary }]}>
            Effort
          </Text>
          <View style={styles.effortTrailing}>
            <Text style={[styles.effortVal, { color: theme.textMuted }]}>
              Medium
            </Text>
            <ChevronRightIcon size={16} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.outline }]} />

        {/* More Models */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onMoreModelsTap}
          style={styles.moreModelsRow}>
          <Text style={[styles.moreModelsText, { color: theme.textPrimary }]}>
            More models
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionTextCol: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  effortTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  effortTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  effortVal: {
    fontSize: 15,
    fontWeight: '500',
  },
  moreModelsRow: {
    paddingVertical: 14,
  },
  moreModelsText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
