import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CameraIcon,
  ChevronRightIcon,
  CloseIcon,
  CloudSnowIcon,
  ConnectIcon,
  FolderLibraryIcon,
  PhotosIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';

interface ChatAttachmentSheetProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onCameraTap: () => void;
  onPhotosTap: () => void;
  onAddToProjectTap: () => void;
  onToolAccessTap: () => void;
}

export function ChatAttachmentSheet({
  visible,
  theme,
  onClose,
  onCameraTap,
  onPhotosTap,
  onAddToProjectTap,
  onToolAccessTap,
}: ChatAttachmentSheetProps) {
  const insets = useSafeAreaInsets();
  const [researchEnabled, setResearchEnabled] = useState(false);

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
            Add to chat
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.closeBtn}>
            <CloseIcon size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions (Camera & Photos) */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCameraTap}
            style={[styles.quickCard, { backgroundColor: theme.buttonBackground }]}>
            <CameraIcon size={24} color={theme.textPrimary} />
            <Text style={[styles.quickLabel, { color: theme.textPrimary }]}>
              Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPhotosTap}
            style={[styles.quickCard, { backgroundColor: theme.buttonBackground }]}>
            <PhotosIcon size={24} color={theme.textPrimary} />
            <Text style={[styles.quickLabel, { color: theme.textPrimary }]}>
              Photos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Research Option */}
        <View style={styles.optionRow}>
          <View style={styles.optionLeading}>
            <CloudSnowIcon size={22} color={theme.textPrimary} />
            <View style={styles.optionTexts}>
              <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                Research
              </Text>
              <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>
                Deep multi-step reasoning & web analysis
              </Text>
            </View>
          </View>
          <Switch
            value={researchEnabled}
            onValueChange={setResearchEnabled}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.blue }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.outline }]} />

        {/* Add to Project */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAddToProjectTap}
          style={styles.optionRow}>
          <View style={styles.optionLeading}>
            <FolderLibraryIcon size={22} color={theme.textPrimary} />
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
              Add to Project
            </Text>
          </View>
          <ChevronRightIcon size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.outline }]} />

        {/* Tool Access */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToolAccessTap}
          style={styles.optionRow}>
          <View style={styles.optionLeading}>
            <ConnectIcon size={22} color={theme.textPrimary} />
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
              Tool access
            </Text>
          </View>
          <ChevronRightIcon size={18} color={theme.textMuted} />
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
    paddingBottom: 16,
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
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    height: 90,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
