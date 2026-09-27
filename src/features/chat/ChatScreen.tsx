import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { ChatModelType } from '../../types';
import { ChatAttachmentSheet } from './components/ChatAttachmentSheet';
import { ChatComposer } from './components/ChatComposer';
import { ChatEmptyState } from './components/ChatEmptyState';
import { ChatHeader } from './components/ChatHeader';
import { ChatIncognitoView } from './components/ChatIncognitoView';
import { ChatModelSelectionSheet } from './components/ChatModelSelectionSheet';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { NativeSpeech } from '../../services/nativeModules';

function getModelLabel(model: ChatModelType): string {
  switch (model) {
    case 'opus-4.8':
      return 'Opus 4.8';
    case 'puku-ai-2.8':
      return 'puku-ai-2.8';
    case 'puku-ai-2.7':
    default:
      return 'puku-ai-2.7';
  }
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    activeConversation,
    sendMessage,
    isGenerating,
    isLoadingConversation,
    selectedModel,
    setSelectedModel,
    isIncognito,
    setIncognito,
    setDrawerOpen,
    navigate,
    incognitoMessages,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const activeMessages = activeConversation?.messages || [];
  const messages = isIncognito ? incognitoMessages : activeMessages;

  // Automatically scroll to the latest message whenever entering/loading a chat
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
      const t1 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
      const t2 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeConversation?.id, isLoadingConversation]);

  // Handle native speech recognition for microphone
  useEffect(() => {
    const unsubResults = NativeSpeech.onSpeechResults(text => {
      if (text) {
        setInputVal(prev => (prev ? `${prev} ${text}` : text));
      }
      setIsListening(false);
    });

    const unsubPartial = NativeSpeech.onSpeechPartialResults(text => {
      if (text) {
        setInputVal(text);
      }
    });

    const unsubEnd = NativeSpeech.onSpeechEnd(() => {
      setIsListening(false);
    });

    const unsubError = NativeSpeech.onSpeechError(() => {
      setIsListening(false);
    });

    return () => {
      unsubResults();
      unsubPartial();
      unsubEnd();
      unsubError();
    };
  }, []);

  const handleToggleMic = async () => {
    if (isListening) {
      await NativeSpeech.stopListening();
      setIsListening(false);
    } else {
      const started = await NativeSpeech.startListening();
      if (started) {
        setIsListening(true);
      } else {
        navigate('transcribe');
      }
    }
  };

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
        {isLoadingConversation && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading conversation...
            </Text>
          </View>
        ) : isIncognito && messages.length === 0 ? (
          <ChatIncognitoView
            theme={theme}
            onLearnMoreTap={() => setIncognito(false)}
          />
        ) : !isIncognito && messages.length === 0 ? (
          <ChatEmptyState theme={theme} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: isGenerating })
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} theme={theme} />
            )}
            ListFooterComponent={
              isGenerating &&
              (!messages.length ||
                messages[messages.length - 1]?.role !== 'assistant') ? (
                <TypingIndicator theme={theme} />
              ) : undefined
            }
          />
        )}
      </View>

      {/* 1:1 Authentic Composer */}
      <ChatComposer
        theme={theme}
        inputVal={inputVal}
        onChangeText={setInputVal}
        selectedModelLabel={getModelLabel(selectedModel)}
        isSending={isGenerating}
        isListening={isListening}
        onFocus={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 80);
        }}
        onPlusTap={() => setShowAttachmentSheet(true)}
        onModelTap={() => setShowModelSheet(true)}
        onSubmitTap={handleSend}
        onVoiceConversationTap={() => navigate('liveVoice')}
        onMicrophoneTap={handleToggleMic}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 12,
  },
});
