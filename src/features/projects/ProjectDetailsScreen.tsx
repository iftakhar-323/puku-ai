import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/common/AppHeader';
import {
  CameraIcon,
  CloseIcon,
  DeleteIcon,
  PaperclipIcon,
  PlusIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { NativePicker } from '../../services/nativeModules';

const KNOWLEDGE_ITEM_CAP = 20;

export function ProjectDetailsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const {
    theme,
    activeProject,
    updateProject,
    deleteProject,
    addProjectKnowledge,
    startNewChat,
    goBack,
  } = useApp();

  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructionsText, setInstructionsText] = useState(
    activeProject?.instructions || ''
  );
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [isPickingContent, setIsPickingContent] = useState(false);

  if (!activeProject) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <AppHeader showBack title="Project Details" />
        <View style={styles.centerBox}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            No project selected
          </Text>
        </View>
      </View>
    );
  }

  const handleSaveInstructions = () => {
    updateProject(activeProject.id, { instructions: instructionsText.trim() });
    setShowInstructionsModal(false);
  };

  const handlePickFile = async () => {
    setIsPickingContent(true);
    try {
      const media = await NativePicker.pickMedia();
      if (media) {
        const type = media.type?.startsWith('image/') ? 'IMAGE' : 'DOC';
        addProjectKnowledge(activeProject.id, media.name, type, media.size);
        setShowAddContentModal(false);
      }
    } finally {
      setIsPickingContent(false);
    }
  };

  const handleTakePhoto = async () => {
    setIsPickingContent(true);
    try {
      const media = await NativePicker.takePhoto();
      if (media) {
        addProjectKnowledge(activeProject.id, media.name, 'IMAGE', media.size);
        setShowAddContentModal(false);
      }
    } finally {
      setIsPickingContent(false);
    }
  };

  const confirmDeleteProject = () => {
    Alert.alert(
      t('projects.deleteProjectTitle'),
      t('projects.deleteProjectMessage', { name: activeProject.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteProject(activeProject.id);
            goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        showBack
        title={activeProject.name}
        rightAction={
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete"
            onPress={confirmDeleteProject}
            style={[styles.actionBtn, { backgroundColor: theme.buttonBackground }]}>
            <DeleteIcon size={18} color={theme.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Project Header Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.titleRow}>
            <Text style={[styles.projectTitle, { color: theme.textPrimary }]}>
              {activeProject.name}
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.pillBackground },
              ]}>
              <Text style={[styles.badgeText, { color: theme.tagText }]}>
                {activeProject.scope}
              </Text>
            </View>
          </View>

          {activeProject.description ? (
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              {activeProject.description}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={() => startNewChat(activeProject.id)}
            style={[styles.newChatBtn, { backgroundColor: theme.primary }]}>
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.newChatBtnText}>{t('projects.newChatInProject')}</Text>
          </TouchableOpacity>
        </View>

        {/* Project Knowledge Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('projects.knowledgeSectionTitle')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddContentModal(true)}
              style={[styles.addBtn, { backgroundColor: theme.buttonBackground }]}>
              <PlusIcon size={14} color={theme.tagText} />
              <Text style={[styles.addBtnText, { color: theme.tagText }]}>
                {t('projects.addContent')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            {t('projects.knowledgeSectionDesc')}
          </Text>

          <View style={styles.capacityRow}>
            <View style={[styles.capacityTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.capacityFill,
                  {
                    backgroundColor:
                      activeProject.knowledgeItems.length >= KNOWLEDGE_ITEM_CAP
                        ? theme.error
                        : theme.primaryLight,
                    width: `${Math.min(
                      100,
                      (activeProject.knowledgeItems.length / KNOWLEDGE_ITEM_CAP) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.capacityLabel, { color: theme.textMuted }]}>
              {activeProject.knowledgeItems.length}/{KNOWLEDGE_ITEM_CAP}
            </Text>
          </View>

          {activeProject.knowledgeItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {t('projects.noKnowledgeFiles')}
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {activeProject.knowledgeItems.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.knowledgeRow,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemFileName, { color: theme.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      {item.type} • {item.size} • {item.date}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Custom Instructions Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('projects.customInstructionsTitle')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowInstructionsModal(true)}
              style={[styles.addBtn, { backgroundColor: theme.buttonBackground }]}>
              <Text style={[styles.addBtnText, { color: theme.tagText }]}>
                {activeProject.instructions ? t('projects.editLabel') : t('projects.addLabel')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            {t('projects.customInstructionsDesc')}
          </Text>

          {activeProject.instructions ? (
            <View
              style={[
                styles.instructionsBox,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <Text style={[styles.instructionsContent, { color: theme.textPrimary }]}>
                {activeProject.instructions}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {t('projects.noCustomInstructions')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Instructions Modal */}
      <Modal
        visible={showInstructionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstructionsModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => setShowInstructionsModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.secondaryBackground,
                paddingBottom:
                  Platform.OS === 'android' && keyboardHeight > 0
                    ? keyboardHeight + 16
                    : Math.max(insets.bottom, 20),
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {t('projects.customInstructionsTitle')}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowInstructionsModal(false)}>
                <CloseIcon size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.instructionsInput,
                {
                  backgroundColor: theme.background,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('projects.instructionsPlaceholderLong')}
              placeholderTextColor={theme.placeholderText}
              value={instructionsText}
              onChangeText={setInstructionsText}
              multiline
              numberOfLines={6}
            />
            <TouchableOpacity
              onPress={handleSaveInstructions}
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.saveBtnText}>{t('projects.saveInstructions')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Knowledge Modal */}
      <Modal
        visible={showAddContentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContentModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => setShowAddContentModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.secondaryBackground,
                paddingBottom:
                  Platform.OS === 'android' && keyboardHeight > 0
                    ? keyboardHeight + 16
                    : Math.max(insets.bottom, 20),
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {t('projects.addContentModalTitle')}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowAddContentModal(false)}>
                <CloseIcon size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              disabled={isPickingContent}
              onPress={handleTakePhoto}
              style={[
                styles.pickerRow,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <CameraIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.pickerRowText, { color: theme.textPrimary }]}>
                {t('projects.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Choose file or photo"
              disabled={isPickingContent}
              onPress={handlePickFile}
              style={[
                styles.pickerRow,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <PaperclipIcon size={20} color={theme.textPrimary} />
              <Text style={[styles.pickerRowText, { color: theme.textPrimary }]}>
                {t('projects.chooseFileOrPhoto')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    gap: 8,
    marginTop: 4,
  },
  newChatBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  capacityTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 8,
  },
  knowledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemFileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
  },
  instructionsBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  instructionsContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  instructionsInput: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pickerRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
