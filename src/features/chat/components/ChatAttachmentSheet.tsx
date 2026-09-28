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
import {
  ChevronRightIcon,
  ConnectorsBranchIcon,
  FolderOutlinedIcon,
  PaperclipIcon,
  ToolsGridIcon,
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
  onConnectorsTap?: () => void;
}

export function ChatAttachmentSheet({
  visible,
  theme,
  onClose,
  onCameraTap,
  onPhotosTap,
  onAddToProjectTap,
  onToolAccessTap,
  onConnectorsTap,
}: ChatAttachmentSheetProps) {
  const insets = useSafeAreaInsets();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handleFilesPress = () => {
    onClose();
    onPhotosTap();
  };

  const handleToolsPress = () => {
    onClose();
    onToolAccessTap();
  };

  const handleProjectPress = () => {
    onClose();
    onAddToProjectTap();
  };

  const handleConnectorsPress = () => {
    onClose();
    onConnectorsTap?.();
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
          styles.sheetContent,
          {
            backgroundColor: theme.cardBackground,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>
        {/* Top Handle */}
        <View style={styles.handleWrapper}>
          <View style={[styles.handleBar, { backgroundColor: theme.textMuted }]} />
        </View>

        {/* Title */}
        <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
          Add
        </Text>

        {/* Action Rows */}
        <View style={styles.rowsList}>
          {/* 1. Add files or photos */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleFilesPress}
            style={styles.actionRow}>
            <View style={styles.leftInfo}>
              <PaperclipIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.actionLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Add files or photos
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. Tools */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToolsPress}
            style={styles.actionRow}>
            <View style={styles.leftInfo}>
              <ToolsGridIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.actionLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Tools
              </Text>
            </View>
            <ChevronRightIcon size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* 3. Add to project */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleProjectPress}
            style={styles.actionRow}>
            <View style={styles.leftInfo}>
              <FolderOutlinedIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.actionLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Add to project
              </Text>
            </View>
            <ChevronRightIcon size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* 4. Connectors */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleConnectorsPress}
            style={styles.actionRow}>
            <View style={styles.leftInfo}>
              <ConnectorsBranchIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.actionLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Connectors
              </Text>
            </View>
            <ChevronRightIcon size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  rowsList: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionLabel: {
    fontSize: 15,
  },
});
