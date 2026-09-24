import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/common/AppHeader';
import {
  CheckmarkIcon,
  CloseIcon,
  CopyIcon,
  IncognitoIcon,
  MicIcon,
  PlusIcon,
  PukuLogoBadge,
  SendIcon,
} from '../components/common/Icons';
import { useApp } from '../store/AppContext';
import { ChatMessage, ChatModelType } from '../types';

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    activeConversation,
    sendMessage,
    isGenerating,
    selectedModel,
    setSelectedModel,
    isIncognito,
    setIncognito,
    navigate,
    projects,
    activeProject,
    selectProject,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showProjectSheet, setShowProjectSheet] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = activeConversation?.messages || [];

  const handleSend = () => {
    if (!inputVal.trim() || isGenerating) return;
    sendMessage(inputVal.trim());
    setInputVal('');
  };

  const copyText = (id: string, text: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleMicPress = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate speech-to-text recording
      setTimeout(() => {
        setIsRecording(false);
        setInputVal('Can you explain how to optimize our mobile application performance?');
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  const models: Array<{ id: ChatModelType; name: string; desc: string }> = [
    { id: 'puku-ai-2.7', name: 'puku-ai-2.7', desc: 'Fast, efficient multimodal reasoning' },
    { id: 'puku-ai-2.8', name: 'puku-ai-2.8', desc: 'Advanced coding & reasoning engine' },
    { id: 'opus-4.8', name: 'opus-4.8', desc: 'Maximum intelligence for complex engineering' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <AppHeader
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIncognito(!isIncognito)}
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isIncognito
                    ? theme.primary
                    : theme.buttonBackground,
                },
              ]}>
              <IncognitoIcon
                size={18}
                color={isIncognito ? '#FFFFFF' : theme.tagText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowProjectSheet(true)}
              style={[
                styles.projectTagPill,
                {
                  backgroundColor: theme.buttonBackground,
                  borderColor: theme.border,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[styles.projectTagText, { color: theme.tagText }]}>
                {activeProject ? activeProject.name : 'No Project'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Main Content Area */}
      {messages.length === 0 ? (
        <View style={styles.heroSection}>
          <PukuLogoBadge size={68} bg={theme.primary} />
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>
            How can i help you{' '}
            <Text style={{ color: theme.primary, fontWeight: '800' }}>today!</Text>
          </Text>

          {/* Quick Prompts */}
          <View style={styles.quickPrompts}>
            <QuickPromptCard
              theme={theme}
              title="Optimize APK size"
              subtitle="Tips for Hermes & ABI splitting"
              onPress={() => setInputVal('How to optimize Android APK size in React Native?')}
            />
            <QuickPromptCard
              theme={theme}
              title="Code session relay"
              subtitle="Connect to remote developer terminal"
              onPress={() => navigate('remoteSession')}
            />
            <QuickPromptCard
              theme={theme}
              title="Voice transcription"
              subtitle="Transcribe speech to markdown"
              onPress={() => navigate('transcribe')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              theme={theme}
              onCopy={copyText}
              isCopied={copiedId === item.id}
            />
          )}
          ListFooterComponent={
            isGenerating ? (
              <View style={styles.generatingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.generatingText, { color: theme.textSecondary }]}>
                  Puku AI is thinking...
                </Text>
              </View>
            ) : undefined
          }
        />
      )}

      {/* Recording Indicator Banner */}
      {isRecording && (
        <View style={[styles.recordingBanner, { backgroundColor: theme.primary }]}>
          <View style={styles.pulseDot} />
          <Text style={styles.recordingText}>Listening to your voice...</Text>
          <TouchableOpacity onPress={() => setIsRecording(false)}>
            <CloseIcon size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Floating Composer Card */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
        <View
          style={[
            styles.chatCard,
            {
              backgroundColor: theme.chatBarBackground,
              borderColor: theme.chatBarBorder,
            },
          ]}>
          <TextInput
            style={[styles.inputField, { color: theme.textPrimary, maxHeight: 100 }]}
            placeholder={isIncognito ? 'Incognito chat with Puku...' : 'Chat with Puku...'}
            placeholderTextColor={theme.placeholderText}
            value={inputVal}
            onChangeText={setInputVal}
            multiline
          />

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            {/* Left Controls: Plus Button & Model Selector Pill */}
            <View style={styles.leftControls}>
              <TouchableOpacity
                onPress={() => setShowAttachSheet(true)}
                activeOpacity={0.7}
                style={[styles.circleBtn, { backgroundColor: theme.buttonBackground }]}>
                <PlusIcon size={18} color={theme.tagText} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowModelSheet(true)}
                activeOpacity={0.7}
                style={[styles.modelPill, { backgroundColor: theme.pillBackground }]}>
                <Text style={[styles.modelText, { color: theme.tagText }]}>
                  {selectedModel}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right Control: Mic or Send Button */}
            {inputVal.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSend}
                activeOpacity={0.7}
                style={[styles.circleBtn, { backgroundColor: theme.primary }]}>
                <SendIcon size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleMicPress}
                activeOpacity={0.7}
                style={[
                  styles.circleBtn,
                  {
                    backgroundColor: isRecording
                      ? theme.error
                      : theme.buttonBackground,
                  },
                ]}>
                <MicIcon
                  size={18}
                  color={isRecording ? '#FFFFFF' : theme.tagText}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Model Selection Bottom Sheet */}
      <Modal
        visible={showModelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelSheet(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModelSheet(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Select Model
            </Text>
            <TouchableOpacity onPress={() => setShowModelSheet(false)}>
              <CloseIcon size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          {models.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                setSelectedModel(m.id);
                setShowModelSheet(false);
              }}
              style={[
                styles.modelOption,
                selectedModel === m.id && {
                  backgroundColor: theme.buttonBackground,
                  borderColor: theme.primary,
                  borderWidth: 1.5,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelOptionName, { color: theme.textPrimary }]}>
                  {m.name}
                </Text>
                <Text style={[styles.modelOptionDesc, { color: theme.textSecondary }]}>
                  {m.desc}
                </Text>
              </View>
              {selectedModel === m.id && (
                <CheckmarkIcon size={18} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Attachment Sheet */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachSheet(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAttachSheet(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Add Attachment
            </Text>
            <TouchableOpacity onPress={() => setShowAttachSheet(false)}>
              <CloseIcon size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.attachmentGrid}>
            <AttachOptionItem
              theme={theme}
              title="Camera"
              desc="Take photo"
              onPress={() => {
                setShowAttachSheet(false);
                setInputVal('Attached photo from camera for analysis.');
              }}
            />
            <AttachOptionItem
              theme={theme}
              title="Photos & Images"
              desc="Select gallery image"
              onPress={() => {
                setShowAttachSheet(false);
                setInputVal('Attached screenshot from library.');
              }}
            />
            <AttachOptionItem
              theme={theme}
              title="Document / File"
              desc="PDF, TXT, JSON"
              onPress={() => {
                setShowAttachSheet(false);
                setInputVal('Attached project document for review.');
              }}
            />
            <AttachOptionItem
              theme={theme}
              title="Code Snippet"
              desc="Paste code snippet"
              onPress={() => {
                setShowAttachSheet(false);
                setInputVal('```typescript\n// Paste your code here\n```');
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Project Selector Sheet */}
      <Modal
        visible={showProjectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectSheet(false)}>
        <TouchableWithoutFeedback onPress={() => setShowProjectSheet(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Assign Project
            </Text>
            <TouchableOpacity onPress={() => setShowProjectSheet(false)}>
              <CloseIcon size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => {
              selectProject(null);
              setShowProjectSheet(false);
            }}
            style={[
              styles.modelOption,
              !activeProject && {
                backgroundColor: theme.buttonBackground,
                borderColor: theme.primary,
                borderWidth: 1.5,
              },
            ]}>
            <Text style={[styles.modelOptionName, { color: theme.textPrimary }]}>
              None (Global chat)
            </Text>
          </TouchableOpacity>
          {projects.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => {
                selectProject(p.id);
                setShowProjectSheet(false);
              }}
              style={[
                styles.modelOption,
                activeProject?.id === p.id && {
                  backgroundColor: theme.buttonBackground,
                  borderColor: theme.primary,
                  borderWidth: 1.5,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelOptionName, { color: theme.textPrimary }]}>
                  {p.name}
                </Text>
                {p.description && (
                  <Text style={[styles.modelOptionDesc, { color: theme.textSecondary }]}>
                    {p.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function QuickPromptCard({
  theme,
  title,
  subtitle,
  onPress,
}: {
  theme: any;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.quickPromptCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
      ]}>
      <Text style={[styles.promptTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.promptSubtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function MessageItem({
  message,
  theme,
  onCopy,
  isCopied,
}: {
  message: ChatMessage;
  theme: any;
  onCopy: (id: string, text: string) => void;
  isCopied: boolean;
}) {
  const isUser = message.role === 'user';
  const [showThinking, setShowThinking] = useState(false);

  return (
    <View
      style={[
        styles.messageWrapper,
        isUser ? styles.userWrapper : styles.assistantWrapper,
      ]}>
      {!isUser && (
        <View style={styles.assistantAvatarRow}>
          <PukuLogoBadge size={26} bg={theme.primary} />
          <Text style={[styles.modelSignature, { color: theme.textMuted }]}>
            {message.model || 'puku-ai-2.7'}
          </Text>
        </View>
      )}

      {/* Thinking Accordion Block */}
      {message.blocks?.find(b => b.type === 'thinking') && (
        <TouchableOpacity
          onPress={() => setShowThinking(!showThinking)}
          style={[
            styles.thinkingBox,
            { backgroundColor: theme.thinkingBackground, borderColor: theme.border },
          ]}>
          <Text style={[styles.thinkingLabel, { color: theme.tagText }]}>
            {showThinking ? '▼ Thinking process' : '▶ Thought process'}
          </Text>
          {showThinking && (
            <Text style={[styles.thinkingContent, { color: theme.textSecondary }]}>
              {message.blocks?.find(b => b.type === 'thinking')?.text}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.messageBubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubble }]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: theme.assistantBubble,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ],
        ]}>
        <Text
          style={[
            styles.messageText,
            { color: isUser ? '#FFFFFF' : theme.textPrimary },
          ]}>
          {message.content}
        </Text>

        {!isUser && (
          <View style={styles.bubbleActionRow}>
            <TouchableOpacity
              onPress={() => onCopy(message.id, message.content)}
              style={styles.actionIconButton}>
              {isCopied ? (
                <CheckmarkIcon size={14} color={theme.success} />
              ) : (
                <CopyIcon size={14} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function AttachOptionItem({
  theme,
  title,
  desc,
  onPress,
}: {
  theme: any;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.attachOption,
        { backgroundColor: theme.buttonBackground, borderColor: theme.border },
      ]}>
      <Text style={[styles.attachTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.attachDesc, { color: theme.textSecondary }]}>
        {desc}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 130,
  },
  projectTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 28,
    letterSpacing: -0.4,
  },
  quickPrompts: {
    width: '100%',
    gap: 10,
  },
  quickPromptCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  promptSubtitle: {
    fontSize: 12,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageWrapper: {
    marginVertical: 4,
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  assistantWrapper: {
    alignItems: 'flex-start',
  },
  assistantAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modelSignature: {
    fontSize: 11,
    fontWeight: '600',
  },
  thinkingBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    maxWidth: '92%',
  },
  thinkingLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  thinkingContent: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 12,
  },
  actionIconButton: {
    padding: 4,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  generatingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4D4F',
  },
  recordingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  bottomSection: {
    paddingHorizontal: 16,
  },
  chatCard: {
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
  },
  inputField: {
    fontSize: 15,
    minHeight: 38,
    paddingVertical: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  modelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
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
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  modelOptionName: {
    fontSize: 15,
    fontWeight: '700',
  },
  modelOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attachOption: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  attachTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  attachDesc: {
    fontSize: 12,
  },
});
