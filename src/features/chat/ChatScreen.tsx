import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
import { NativeClipboard, NativeSpeech } from '../../services/nativeModules';
import { useToast } from '../../components/ui/Toast';

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
    isDark,
    updateSettings,
    conversations,
    selectConversation,
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
  const { show } = useToast();

  const [inputVal, setInputVal] = useState('');
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  const activeMessages = activeConversation?.messages || [];
  const rawMessages = isIncognito ? incognitoMessages : activeMessages;
  // Filter out any empty assistant messages from past/historical conversations
  const messages = rawMessages.filter(
    (m, idx) =>
      m.role === 'user' ||
      (m.content && m.content.trim().length > 0) ||
      (isGenerating && idx === rawMessages.length - 1)
  );

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
      setIsListening(true);
      try {
        await NativeSpeech.startListening();
      } catch {
        // Fallback keep listening flag
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

  const handleEditPrompt = (text: string) => {
    setInputVal(text);
    inputRef.current?.focus();
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleRegenerate = (messageId: string) => {
    if (isGenerating) return;
    const index = messages.findIndex(m => m.id === messageId);
    if (index > 0) {
      const userMsg = messages[index - 1];
      if (userMsg && userMsg.role === 'user' && userMsg.content) {
        sendMessage(userMsg.content);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 12),
        },
      ]}>
      {/* 1:1 Authentic Header with SidebarToggle, Terminal, Bot, and Theme toggle */}
      <ChatHeader
        theme={theme}
        isDark={isDark}
        isIncognitoMode={isIncognito}
        title={isIncognito ? 'Incognito' : null}
        onLeadingTap={() => setDrawerOpen(true)}
        onTrailingTap={() => setIncognito(!isIncognito)}
        onTerminalTap={() => navigate('code')}
        onBotTap={() => navigate('pukuBot')}
        onThemeTap={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
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
          <ChatEmptyState
            theme={theme}
            conversations={conversations}
            onSelectConversation={id => selectConversation(id)}
            onPromptTap={prompt => {
              sendMessage(prompt);
            }}
          />
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
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                theme={theme}
                isGenerating={isGenerating && index === messages.length - 1}
                onEditPrompt={handleEditPrompt}
                onRegenerate={handleRegenerate}
              />
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

      {/* 1:1 Authentic Composer with Dropdown */}
      <ChatComposer
        inputRef={inputRef}
        theme={theme}
        inputVal={inputVal}
        onChangeText={setInputVal}
        selectedModel={selectedModel}
        onSelectModel={model => setSelectedModel(model)}
        isSending={isGenerating}
        isListening={isListening}
        onFocus={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 80);
        }}
        onPlusTap={() => setShowAttachmentSheet(true)}
        onSubmitTap={handleSend}
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
    paddingTop: 12,
    paddingBottom: 28,
  },
});
