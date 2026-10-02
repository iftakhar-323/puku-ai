import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraIcon, PaperclipIcon } from './Icons';
import { ThemeColors } from '../../theme/theme';

interface MediaPickerModalProps {
  visible: boolean;
  theme: ThemeColors;
  isDark?: boolean;
  title?: string;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickMedia: () => void;
}

export function MediaPickerModal({
  visible,
  theme,
  isDark = true,
  title = 'Add Attachment',
  onClose,
  onTakePhoto,
  onPickMedia,
}: MediaPickerModalProps) {
  const insets = useSafeAreaInsets();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handleTake = () => {
    onClose();
    setTimeout(() => {
      onTakePhoto();
    }, 100);
  };

  const handlePick = () => {
    onClose();
    setTimeout(() => {
      onPickMedia();
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.outline || theme.border,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>
        {/* Top Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handleBar, { backgroundColor: theme.textMuted }]} />
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {title}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsWrap}>
          {/* Option 1: Take Photo */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleTake}
            style={[
              styles.optionCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: theme.outline || theme.border,
              },
            ]}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isDark
                    ? 'rgba(176, 179, 252, 0.16)'
                    : 'rgba(72, 77, 208, 0.12)',
                },
              ]}>
              <CameraIcon size={22} color={theme.primaryLight} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionMainText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Take Photo
              </Text>
              <Text style={[styles.optionSubText, { color: theme.textSecondary }]}>
                Capture live image with your camera
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Choose File or Photo */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePick}
            style={[
              styles.optionCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: theme.outline || theme.border,
              },
            ]}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isDark
                    ? 'rgba(176, 179, 252, 0.16)'
                    : 'rgba(72, 77, 208, 0.12)',
                },
              ]}>
              <PaperclipIcon size={22} color={theme.primaryLight} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionMainText, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Choose File or Photo
              </Text>
              <Text style={[styles.optionSubText, { color: theme.textSecondary }]}>
                Select from gallery, photos, or documents
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={[
            styles.cancelBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: theme.border,
            },
          ]}>
          <Text style={[styles.cancelBtnText, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Cancel
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
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  titleRow: {
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  optionsWrap: {
    gap: 10,
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionMainText: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionSubText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
