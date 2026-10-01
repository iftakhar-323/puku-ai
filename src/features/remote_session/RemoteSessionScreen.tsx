import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  ConnectedLinkIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LogoutIcon,
  PlusIcon,
  RemoteIcon,
  SendIcon,
  SoundWaveIcon,
  TerminalWindowIcon,
  TrashIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { NativeClipboard } from '../../services/nativeModules';
import { useToast } from '../../components/ui/Toast';
import { MarkdownRenderer } from '../chat/components/MarkdownRenderer';
import { TypingIndicator } from '../chat/components/TypingIndicator';
import { lightTheme, ThemeColors } from '../../theme/theme';

interface ParsedToolExecution {
  id: string;
  name: string;
  command: string;
  description: string;
  output: string;
  isSuccess: boolean;
}

const whiteViewTheme: ThemeColors = {
  ...lightTheme,
  background: '#FAF9F6',
  cardBackground: '#FFFFFF',
  secondaryBackground: '#F4F4F6',
  chatBarBackground: '#FFFFFF',
  outline: '#E5E7EB',
  codeBackground: '#F3F4F6',
  textPrimary: '#18181B',
  textSecondary: '#4B5563',
  primary: '#7C3AED',
  border: '#E5E7EB',
};

export function RemoteSessionScreen() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const {
    theme,
    goBack,
    remoteSession,
    activeRelaySessions,
    fetchActiveRelaySessions,
    connectRemoteSession,
    disconnectRemoteSession,
    sendRemoteMessage,
    sendRemoteInterrupt,
    clearRemoteLogs,
    respondToTool,
  } = useApp();

  const [inputSessionId, setInputSessionId] = useState(remoteSession.sessionId || '');
  const [inputToken, setInputToken] = useState(remoteSession.token || '');
  const [showToken, setShowToken] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ParsedToolExecution | null>(null);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const isConnected = remoteSession.status === 'connected';
  const { show } = useToast();
  const lastVibratedToolRef = useRef<string | null>(null);

  useEffect(() => {
    fetchActiveRelaySessions().catch(() => {});
  }, [fetchActiveRelaySessions]);

  useEffect(() => {
    if (!inputSessionId && activeRelaySessions.length > 0) {
      setInputSessionId(activeRelaySessions[0].sessionId);
      if (activeRelaySessions[0].mobileToken) {
        setInputToken(activeRelaySessions[0].mobileToken);
      }
    }
  }, [activeRelaySessions, inputSessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [remoteSession.logs, remoteSession.currentTool]);

  // Auto-scroll when keyboard opens
  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [keyboardHeight]);

  // Vibrate phone when laptop requests permission
  useEffect(() => {
    if (
      remoteSession.currentTool &&
      remoteSession.currentTool.status === 'pending' &&
      lastVibratedToolRef.current !== (remoteSession.currentTool.id || null)
    ) {
      lastVibratedToolRef.current = remoteSession.currentTool.id || null;
      try {
        Vibration.vibrate([0, 180, 80, 220]);
      } catch {}
    }
  }, [remoteSession.currentTool]);

  const handleConnect = () => {
    if (!inputSessionId.trim()) return;
    connectRemoteSession(inputSessionId.trim(), inputToken.trim());
  };

  const handleCopyText = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    NativeClipboard.setString(cleanText);
    try {
      Vibration.vibrate(40);
    } catch {}
    show({ title: 'Copied to clipboard' });
  };

  const handleSendCommand = (textToSend?: string) => {
    const text = (textToSend ?? commandText).trim();
    if (!text) return;
    setIsSending(true);
    sendRemoteMessage(text);
    if (!textToSend) {
      setCommandText('');
    }
    setTimeout(() => setIsSending(false), 200);
  };

  // Helper to parse tool execution details for Terminal modal
  const parseToolLog = (log: string, logIndex: number): ParsedToolExecution => {
    const rest = log.replace(/^\[Tool\]\s*/, '').trim();
    let toolName = 'Terminal';
    let command = '';
    let description = '';
    let output = '';
    const isSuccess = true;

    const callMatch = rest.match(/^([a-zA-Z0-9_-]+)\(([\s\S]*)\)$/);
    if (callMatch) {
      toolName = callMatch[1];
      const rawArgs = callMatch[2].trim();
      try {
        const parsed = JSON.parse(rawArgs);
        command = parsed.command || parsed.cmd || parsed.file_path || parsed.query || rawArgs;
        description = parsed.description || parsed.title || command || toolName;
      } catch {
        command = rawArgs;
        description = rawArgs;
      }
    } else if (rest.includes(':')) {
      const colonIdx = rest.indexOf(':');
      toolName = rest.slice(0, colonIdx).trim();
      command = rest.slice(colonIdx + 1).trim();
      description = command;
    } else {
      toolName = rest;
      command = rest;
      description = rest;
    }

    // Look for tool output in subsequent logs
    for (let j = logIndex + 1; j < Math.min(logIndex + 8, remoteSession.logs.length); j++) {
      const nextLog = typeof remoteSession.logs[j] === 'string' ? remoteSession.logs[j] : '';
      if (nextLog.startsWith('[ToolResult]')) {
        output = nextLog.replace(/^\[ToolResult\]\s*/, '').trim();
        break;
      }
      if (nextLog.startsWith('✓ Done')) {
        if (!output) {
          output = nextLog.trim();
        }
      }
      if (nextLog.startsWith('[Tool]') || nextLog.startsWith('> ')) {
        break;
      }
    }

    if (!output) {
      output = 'Exit code 0\nCommand completed successfully.';
    }

    return {
      id: `tool_${logIndex}`,
      name: toolName,
      command: command || description,
      description: description || command || toolName,
      output,
      isSuccess,
    };
  };

  // Helper to format each log item into clean, modern UI components
  const renderLogItem = (rawLog: any, index: number) => {
    const log =
      typeof rawLog === 'string'
        ? rawLog
        : typeof rawLog === 'object'
        ? JSON.stringify(rawLog)
        : String(rawLog ?? '');

    // 1. User message bubble (soft lavender/periwinkle pill on the right)
    if (log.startsWith('> ')) {
      const cmd = log.slice(2).trim();
      return (
        <View key={index} style={styles.userRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            delayLongPress={200}
            onLongPress={() => handleCopyText(cmd)}
            style={styles.userBubble}>
            <Text style={styles.userText}>{cmd}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 2. Tool invocation -> clean minimal row: `<Description>  >` which opens Terminal Modal!
    if (log.startsWith('[Tool]')) {
      const parsedTool = parseToolLog(log, index);
      return (
        <TouchableOpacity
          key={index}
          activeOpacity={0.7}
          onPress={() => setSelectedTool(parsedTool)}
          style={styles.toolRow}>
          <Text numberOfLines={1} style={styles.toolRowText}>
            {parsedTool.description}
          </Text>
          <ChevronRightIcon size={16} color="#9CA3AF" />
        </TouchableOpacity>
      );
    }

    // 3. Skip raw tool results, done badges, and running state from cluttering feed
    // (these are viewed inside the Terminal modal or handled by typing indicator)
    if (log.startsWith('[ToolResult]') || log.startsWith('✓ Done') || log.startsWith('[Running]')) {
      return null;
    }

    // 4. Status / System info
    if (log.startsWith('[Status]')) {
      const statusText = log.replace('[Status]', '').trim();
      if (!statusText) return null;
      return (
        <View key={index} style={styles.systemPillRow}>
          <View style={styles.systemPill}>
            <Text style={styles.systemPillText}>{statusText}</Text>
          </View>
        </View>
      );
    }

    if (log.startsWith('[Connection]')) {
      const connText = log.replace('[Connection]', '').trim();
      return (
        <View key={index} style={styles.systemPillRow}>
          <View style={styles.systemPill}>
            <Text style={styles.systemPillText}>{connText}</Text>
          </View>
        </View>
      );
    }

    // 5. Warning / Notice
    if (log.includes('Permission') || log.includes('Warning')) {
      return (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          delayLongPress={200}
          onLongPress={() => handleCopyText(log)}
          style={styles.warningCard}>
          <Text style={styles.warningText}>{log}</Text>
        </TouchableOpacity>
      );
    }

    // 6. Error / Rejection
    if (log.includes('Error') || log.includes('REJECTED') || log.includes('Failed')) {
      return (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          delayLongPress={200}
          onLongPress={() => handleCopyText(log)}
          style={styles.errorCard}>
          <Text style={styles.errorText}>{log}</Text>
        </TouchableOpacity>
      );
    }

    // 7. Assistant output -> rendered with MarkdownRenderer in white theme!
    return (
      <View key={index} style={styles.assistantRow}>
        <View style={styles.assistantCard}>
          <MarkdownRenderer content={log} theme={whiteViewTheme} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom:
            Platform.OS === 'android'
              ? keyboardHeight > 0
                ? keyboardHeight
                : Math.max(insets.bottom, 10)
              : Math.max(insets.bottom, 10),
        },
      ]}>
      {/* Floating Header with Center Card and Green Connection Badge */}
      <View style={styles.floatingHeaderContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={goBack}
          style={styles.headerCircleBtn}>
          <BackIcon size={20} color="#18181B" />
        </TouchableOpacity>

        <View style={styles.headerCenterCard}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {remoteSession.title || 'Hello and how can I help'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isConnected ? 'Remote control attached.' : 'Offline'}
          </Text>
        </View>

        {isConnected ? (
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setShowSessionMenu(true)}
            style={styles.headerCircleBtn}>
            <ConnectedLinkIcon size={20} color="#22C55E" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.headerCircleBtn, { opacity: 0.4 }]}>
            <ConnectedLinkIcon size={20} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Disconnected Pairing Screen */}
      {!isConnected ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.pairingContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.pairingCard}>
            <View style={styles.pairingHeader}>
              <RemoteIcon size={24} color="#7C3AED" />
              <Text style={styles.pairingTitle}>Connect to Laptop CLI</Text>
            </View>

            {activeRelaySessions.length > 0 && (
              <View style={styles.detectedCard}>
                <View style={styles.detectedHeader}>
                  <View style={styles.liveDot} />
                  <Text style={styles.detectedTitle}>Active Laptop Session Detected</Text>
                </View>
                <Text numberOfLines={1} style={styles.detectedName}>
                  {activeRelaySessions[0].title || 'puku-cli'}
                </Text>
                <View style={styles.detectedSessionBox}>
                  <Text style={styles.detectedLabel}>Relay Session ID:</Text>
                  <Text selectable numberOfLines={1} style={styles.detectedSessionValue}>
                    {activeRelaySessions[0].sessionId}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    connectRemoteSession(
                      activeRelaySessions[0].sessionId,
                      activeRelaySessions[0].mobileToken
                    );
                  }}
                  style={styles.quickConnectBtn}>
                  <Text style={styles.quickConnectBtnText}>1-Tap Connect & Control</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>Relay Session ID</Text>
            <TextInput
              style={styles.terminalInput}
              placeholder="e.g. af689a1b-2858-..."
              placeholderTextColor="#9CA3AF"
              value={inputSessionId}
              onChangeText={setInputSessionId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Mobile Session Token (Optional)</Text>
            <View style={styles.tokenInputWrap}>
              <TextInput
                style={styles.tokenInputInner}
                placeholder="Auto-resolved if logged into same account"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showToken}
                value={inputToken}
                onChangeText={setInputToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowToken(!showToken)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}>
                {showToken ? (
                  <EyeOffIcon size={18} color="#6B7280" />
                ) : (
                  <EyeIcon size={18} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConnect}
              style={styles.primaryConnectBtn}>
              <Text style={styles.primaryConnectBtnText}>Connect & Open Terminal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Connected Interactive View */
        <View style={styles.chatContainer}>
          {/* Permission Prompt Banner if needed */}
          {remoteSession.currentTool && remoteSession.currentTool.status === 'pending' && (
            <View style={styles.toolPromptBanner}>
              <View style={styles.toolPromptHeader}>
                <View style={styles.toolPromptTag}>
                  <Text style={styles.toolPromptTagText}>PERMISSION REQUIRED</Text>
                </View>
                <Text numberOfLines={1} style={styles.toolPromptName}>
                  {remoteSession.currentTool.name}
                </Text>
              </View>
              <Text style={styles.toolPromptDesc}>
                {remoteSession.currentTool.description}
              </Text>
              <View style={styles.toolPromptActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(false)}
                  style={styles.toolRejectBtn}>
                  <CloseIcon size={14} color="#EF4444" />
                  <Text style={styles.toolRejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(true)}
                  style={styles.toolApproveBtn}>
                  <CheckmarkIcon size={14} color="#FFFFFF" />
                  <Text style={styles.toolApproveText}>Approve & Run</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Chat Feed */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.feedScroll}
            contentContainerStyle={styles.feedContent}
            keyboardShouldPersistTaps="handled"
            onScroll={event => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const paddingToBottom = 160;
              const isCloseToBottom =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
              setShowScrollBottom(!isCloseToBottom);
            }}
            scrollEventThrottle={100}>
            {remoteSession.logs.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <RemoteIcon size={24} color="#22C55E" />
                </View>
                <Text style={styles.emptyTitle}>Laptop Connected</Text>
                <Text style={styles.emptySubtitle}>
                  Remote control attached. Type commands or requests below.
                </Text>
              </View>
            )}

            {remoteSession.logs.map((log, index) => renderLogItem(log, index))}

            {remoteSession.progressStatus === 'thinking' && (
              <View style={styles.thinkingWrapper}>
                <TypingIndicator theme={whiteViewTheme} />
              </View>
            )}
          </ScrollView>

          {/* Quick Command Chips */}
          <View style={styles.quickChipsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsScroll}>
              {['git status', 'git diff', 'ls -la', 'npm test'].map(cmd => (
                <TouchableOpacity
                  key={cmd}
                  activeOpacity={0.7}
                  onPress={() => handleSendCommand(cmd)}
                  style={styles.quickChipPill}>
                  <Text style={[styles.quickChipPillText, { fontFamily: monoFont }]}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Floating Bottom Capsule Bar */}
          <View style={styles.bottomBarContainer}>
            {showScrollBottom && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                style={styles.scrollToBottomBtn}>
                <ChevronDownIcon size={18} color="#18181B" />
              </TouchableOpacity>
            )}

            <View style={styles.bottomBarCard}>
              <TextInput
                style={styles.bottomBarInput}
                placeholder="Reply to Puku"
                placeholderTextColor="#8E8E93"
                value={commandText}
                onChangeText={setCommandText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => handleSendCommand()}
              />

              <View style={styles.bottomBarControls}>
                <View style={styles.bottomBarLeftGroup}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {}}
                    style={styles.plusBtn}>
                    <PlusIcon size={16} color="#18181B" />
                  </TouchableOpacity>

                  <View style={styles.chipPill}>
                    <Text style={styles.chipPillText}>puku...</Text>
                  </View>

                  <View style={[styles.chipPill, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.chipPillText, { color: '#6B7280' }]}>default</Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isSending}
                  onPress={() => {
                    if (commandText.trim()) {
                      handleSendCommand();
                    }
                  }}
                  style={[
                    styles.bottomSendBtn,
                    {
                      backgroundColor: commandText.trim() ? '#18181B' : '#E5E7EB',
                    },
                  ]}>
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : commandText.trim() ? (
                    <SendIcon size={15} color="#FFFFFF" />
                  ) : (
                    <SoundWaveIcon size={16} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Terminal Modal / Bottom Sheet matching reference images */}
      <Modal
        visible={!!selectedTool}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTool(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedTool(null)}
          style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terminal</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedTool(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.modalCloseBtn}>
                <CloseIcon size={14} color="#18181B" />
              </TouchableOpacity>
            </View>

            {/* Row 1: Purple Terminal Icon + Monospace Command + Green Checkmark */}
            <View style={styles.modalCommandRow}>
              <View style={styles.modalIconCircle}>
                <TerminalWindowIcon size={20} color="#7C3AED" />
              </View>
              <Text numberOfLines={1} style={[styles.modalCommandTitle, { fontFamily: monoFont }]}>
                {selectedTool?.command}
              </Text>
              <View style={styles.modalCheckBadge}>
                <CheckmarkIcon size={13} color="#FFFFFF" />
              </View>
            </View>

            {/* Row 2: Executed Box ($ <command>) */}
            <View style={styles.modalExecBox}>
              <Text style={[styles.modalDollarSign, { fontFamily: monoFont }]}>
                ${' '}
                <Text style={[styles.modalExecText, { fontFamily: monoFont }]}>
                  {selectedTool?.command}
                </Text>
              </Text>
            </View>

            {/* Row 3: Output Header (OUTPUT + ✓ Success) */}
            <View style={styles.modalOutputHeader}>
              <Text style={styles.modalOutputLabel}>OUTPUT</Text>
              <View style={styles.modalSuccessBadge}>
                <CheckmarkIcon size={12} color="#16A34A" />
                <Text style={styles.modalSuccessText}>Success</Text>
              </View>
            </View>

            {/* Row 4: Output Terminal Box */}
            <View style={styles.modalOutputBox}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalOutputScroll}>
                <Text selectable style={[styles.modalOutputText, { fontFamily: monoFont }]}>
                  {selectedTool?.output}
                </Text>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Clean Session Controls Action Sheet (No Red Box Header) */}
      <Modal
        visible={showSessionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSessionMenu(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSessionMenu(false)}
          style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <View style={styles.menuDragHandle} />
            <Text style={styles.menuSheetTitle}>Session Controls</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCopyText(remoteSession.sessionId || '')}
              style={styles.menuOptionRow}>
              <View style={styles.menuOptionInfo}>
                <Text style={styles.menuOptionLabel}>Session ID</Text>
                <Text numberOfLines={1} style={styles.menuOptionValue}>
                  {remoteSession.sessionId || 'active'}
                </Text>
              </View>
              <CopyIcon size={16} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowSessionMenu(false);
                sendRemoteInterrupt();
              }}
              style={styles.menuActionRow}>
              <Text style={styles.menuActionText}>Send Interrupt (^C)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowSessionMenu(false);
                clearRemoteLogs();
              }}
              style={styles.menuActionRow}>
              <TrashIcon size={16} color="#6B7280" />
              <Text style={styles.menuActionText}>Clear Session Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowSessionMenu(false);
                disconnectRemoteSession();
              }}
              style={[styles.menuActionRow, { borderBottomWidth: 0 }]}>
              <LogoutIcon size={16} color="#EF4444" />
              <Text style={[styles.menuActionText, { color: '#EF4444' }]}>
                Disconnect Remote Control
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  floatingHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  headerCenterCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
    textAlign: 'center',
  },
  pairingContent: {
    padding: 16,
  },
  pairingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pairingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  pairingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181B',
  },
  detectedCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  detectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  detectedName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  detectedSessionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  detectedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  detectedSessionValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  quickConnectBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  quickConnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  terminalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: '#18181B',
    backgroundColor: '#F9FAFB',
  },
  tokenInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingRight: 10,
    backgroundColor: '#F9FAFB',
  },
  tokenInputInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: '#18181B',
  },
  eyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryConnectBtn: {
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryConnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  toolPromptBanner: {
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  toolPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolPromptTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toolPromptTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  toolPromptName: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  toolPromptDesc: {
    color: '#78350F',
    fontSize: 12,
    lineHeight: 17,
  },
  toolPromptActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  toolRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  toolRejectText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  toolApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  toolApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#18181B',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 12.5,
    textAlign: 'center',
    paddingHorizontal: 28,
    lineHeight: 18,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: '#ECEEFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: '#18181B',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginVertical: 2,
  },
  toolRowText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 4,
    width: '100%',
    paddingHorizontal: 4,
  },
  assistantCard: {
    width: '100%',
  },
  thinkingWrapper: {
    marginVertical: 4,
    paddingLeft: 4,
  },
  systemPillRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemPill: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  systemPillText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  warningText: {
    color: '#B45309',
    fontSize: 13,
    lineHeight: 18,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  quickChipsRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  quickChipsScroll: {
    gap: 8,
  },
  quickChipPill: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  quickChipPillText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  scrollToBottomBtn: {
    alignSelf: 'center',
    marginBottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  bottomBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bottomBarInput: {
    fontSize: 15,
    color: '#18181B',
    lineHeight: 20,
    maxHeight: 90,
    minHeight: 34,
    paddingVertical: 2,
  },
  bottomBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bottomBarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPill: {
    backgroundColor: '#ECEEFB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipPillText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#4F46E5',
  },
  bottomSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ECECEE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181B',
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCDCE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCommandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  modalCommandTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#18181B',
    marginHorizontal: 12,
  },
  modalCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalExecBox: {
    backgroundColor: '#E2E2E6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  modalDollarSign: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    lineHeight: 20,
  },
  modalExecText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#18181B',
  },
  modalOutputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  modalOutputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
  },
  modalSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  modalOutputBox: {
    backgroundColor: '#E2E2E6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxHeight: 280,
    minHeight: 80,
  },
  modalOutputScroll: {
    flexGrow: 1,
  },
  modalOutputText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#18181B',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  menuDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  menuSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuOptionInfo: {
    flex: 1,
    marginRight: 10,
  },
  menuOptionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  menuOptionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 2,
  },
  menuActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
  },
});
