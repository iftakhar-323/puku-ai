import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { ChatAttachmentSheet } from './components/ChatAttachmentSheet';
import { ChatComposer } from './components/ChatComposer';
import { ChatEmptyState } from './components/ChatEmptyState';
import { ChatHeader } from './components/ChatHeader';
import { ChatIncognitoView } from './components/ChatIncognitoView';
import { ChatModelSelectionSheet } from './components/ChatModelSelectionSheet';
import { MessageBubble } from './components/MessageBubble';

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
    setDrawerOpen,
    navigate,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = activeConversation?.messages || [];

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    if (!inputVal.trim() || isGenerating) return;
    sendMessage(inputVal.trim());
    setInputVal('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: isKeyboardVisible ? 4 : Math.max(insets.bottom, 12),
        },
      ]}>
      {/* 1:1 Authentic Header */}
      <ChatHeader
        theme={theme}
        isIncognitoMode={isIncognito}
        title={isIncognito ? 'Incognito' : null}
        onLeadingTap={() => setDrawerOpen(true)}
        onTrailingTap={() => setIncognito(!isIncognito)}
      />

      {/* Main Body */}
      <View style={styles.body}>
        {isIncognito ? (
          <ChatIncognitoView
            theme={theme}
            onLearnMoreTap={() => setIncognito(false)}
          />
        ) : messages.length === 0 ? (
          <ChatEmptyState theme={theme} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} theme={theme} />
            )}
          />
        )}
      </View>

      {/* 1:1 Authentic Composer */}
      <ChatComposer
        theme={theme}
        inputVal={inputVal}
        onChangeText={setInputVal}
        selectedModelLabel={selectedModel}
        isSending={isGenerating}
        onFocus={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 80);
        }}
        onPlusTap={() => setShowAttachmentSheet(true)}
        onModelTap={() => setShowModelSheet(true)}
        onSubmitTap={handleSend}
        onVoiceConversationTap={() => navigate('liveVoice')}
        onMicrophoneTap={() => navigate('transcribe')}
      />

      {/* 1:1 Model Selection Bottom Sheet */}
      <ChatModelSelectionSheet
        visible={showModelSheet}
        selectedModel={selectedModel}
        theme={theme}
        onClose={() => setShowModelSheet(false)}
        onSelectModel={model => setSelectedModel(model)}
        onEffortTap={() => {}}
        onMoreModelsTap={() => {}}
      />

      {/* 1:1 Attachment Bottom Sheet */}
      <ChatAttachmentSheet
        visible={showAttachmentSheet}
        theme={theme}
        onClose={() => setShowAttachmentSheet(false)}
        onCameraTap={() => setShowAttachmentSheet(false)}
        onPhotosTap={() => setShowAttachmentSheet(false)}
        onAddToProjectTap={() => {
          setShowAttachmentSheet(false);
          navigate('projects');
        }}
        onToolAccessTap={() => {
          setShowAttachmentSheet(false);
          navigate('remoteSession');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
});
