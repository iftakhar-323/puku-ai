import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackIcon,
  CheckmarkIcon,
  CloseIcon,
  LogoutIcon,
  RemoteIcon,
  SendIcon,
  TrashIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

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
  const [commandText, setCommandText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const isConnected = remoteSession.status === 'connected';

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

  // Auto-scroll terminal log to bottom on new messages
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

  const handleConnect = () => {
    if (!inputSessionId.trim()) return;
    connectRemoteSession(inputSessionId.trim(), inputToken.trim());
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

  const handleQuickCommand = (cmd: string) => {
    if (cmd === '^C') {
      sendRemoteInterrupt();
    } else {
      handleSendCommand(cmd);
    }
  };

  // Helper to format each log item into clean, modern UI components
  const renderLogItem = (log: string, index: number) => {
    // 1. User command (e.g. "> ls -la")
    if (log.startsWith('> ')) {
      const cmd = log.slice(2);
      return (
        <View key={index} style={styles.userCmdContainer}>
          <View style={styles.userCmdBubble}>
            <Text style={[styles.userCmdPrompt, { fontFamily: monoFont }]}>❯</Text>
            <Text style={[styles.userCmdText, { fontFamily: monoFont }]}>{cmd}</Text>
          </View>
        </View>
      );
    }

    // 2. Tool invocation (e.g. "[Tool] Bash(...)")
    if (log.startsWith('[Tool]')) {
      const toolDetail = log.replace('[Tool]', '').trim();
      return (
        <View key={index} style={styles.toolCard}>
          <View style={styles.toolHeader}>
            <View style={styles.toolBadge}>
              <Text style={[styles.toolBadgeText, { fontFamily: monoFont }]}>⚡ TOOL</Text>
            </View>
            <Text
              numberOfLines={2}
              style={[styles.toolTitle, { fontFamily: monoFont }]}>
              {toolDetail}
            </Text>
          </View>
        </View>
      );
    }

    // 3. Tool execution progress
    if (log.startsWith('[Running]')) {
      const runningDetail = log.replace('[Running]', '').trim();
      return (
        <View key={index} style={styles.runningRow}>
          <ActivityIndicator size="small" color="#52C41A" style={{ transform: [{ scale: 0.75 }] }} />
          <Text style={[styles.runningText, { fontFamily: monoFont }]}>
            {runningDetail}
          </Text>
        </View>
      );
    }

    // 4. Completed tool / success
    if (log.startsWith('✓ Done')) {
      return (
        <View key={index} style={styles.doneRow}>
          <CheckmarkIcon size={12} color="#52C41A" />
          <Text style={[styles.doneText, { fontFamily: monoFont }]}>{log}</Text>
        </View>
      );
    }

    // 5. Permission / Notice
    if (log.includes('Permission') || log.includes('Warning')) {
      return (
        <View key={index} style={styles.warningCard}>
          <Text style={[styles.warningText, { fontFamily: monoFont }]}>{log}</Text>
        </View>
      );
    }

    // 6. Error / Rejection
    if (log.includes('Error') || log.includes('REJECTED') || log.includes('Failed')) {
      return (
        <View key={index} style={styles.errorCard}>
          <Text style={[styles.errorText, { fontFamily: monoFont }]}>{log}</Text>
        </View>
      );
    }

    // 7. General output / stdout
    return (
      <View key={index} style={styles.logRow}>
        <Text style={[styles.logText, { fontFamily: monoFont }]}>{log}</Text>
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
          backgroundColor: '#0D1117',
          paddingTop: Math.max(insets.top, 10),
          paddingBottom:
            Platform.OS === 'android'
              ? (keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 10))
              : Math.max(insets.bottom, 10),
        },
      ]}>
      {/* Sleek, Compact Minimal Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={goBack}
            style={styles.backBtn}>
            <BackIcon size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { fontFamily: monoFont }]}>
              Laptop CLI
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isConnected ? 'rgba(82, 196, 26, 0.15)' : 'rgba(250, 173, 20, 0.15)',
                  borderColor: isConnected ? '#52C41A' : '#FAAD14',
                },
              ]}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? '#52C41A' : '#FAAD14' },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: isConnected ? '#52C41A' : '#FAAD14', fontFamily: monoFont },
                ]}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>

        {isConnected && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={sendRemoteInterrupt}
              style={styles.interruptBtn}>
              <Text style={[styles.interruptBtnText, { fontFamily: monoFont }]}>^C</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={clearRemoteLogs}
              style={styles.actionIconBtn}>
              <TrashIcon size={16} color="#8C8C8C" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={disconnectRemoteSession}
              style={[styles.actionIconBtn, { backgroundColor: 'rgba(255, 77, 79, 0.12)' }]}>
              <LogoutIcon size={16} color="#FF4D4F" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Terminal Window or Pairing Form */}
      {!isConnected ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.pairingContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.pairingCard}>
            <View style={styles.pairingHeader}>
              <RemoteIcon size={24} color={theme.primary} />
              <Text style={[styles.pairingTitle, { color: '#FFFFFF', fontFamily: monoFont }]}>
                Connect to Laptop CLI
              </Text>
            </View>

            {activeRelaySessions.length > 0 && (
              <View style={styles.detectedCard}>
                <View style={styles.detectedHeader}>
                  <View style={styles.liveDot} />
                  <Text style={[styles.detectedTitle, { color: '#FFFFFF', fontFamily: monoFont }]}>
                    Active Laptop Session Detected
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.detectedId, { color: '#8C8C8C', fontFamily: monoFont }]}>
                  {activeRelaySessions[0].title || 'puku-cli'} · {activeRelaySessions[0].sessionId.slice(0, 16)}...
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    connectRemoteSession(
                      activeRelaySessions[0].sessionId,
                      activeRelaySessions[0].mobileToken
                    );
                  }}
                  style={[styles.quickConnectBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.quickConnectBtnText}>1-Tap Connect & Control</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: '#8C8C8C', fontFamily: monoFont }]}>
              Relay Session ID
            </Text>
            <TextInput
              style={[
                styles.terminalInput,
                {
                  backgroundColor: '#161B22',
                  color: '#FFFFFF',
                  borderColor: '#30363D',
                  fontFamily: monoFont,
                },
              ]}
              placeholder="e.g. af689a1b-2858-..."
              placeholderTextColor="#595959"
              value={inputSessionId}
              onChangeText={setInputSessionId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { color: '#8C8C8C', fontFamily: monoFont }]}>
              Mobile Session Token (Optional)
            </Text>
            <TextInput
              style={[
                styles.terminalInput,
                {
                  backgroundColor: '#161B22',
                  color: '#FFFFFF',
                  borderColor: '#30363D',
                  fontFamily: monoFont,
                },
              ]}
              placeholder="Auto-resolved if logged into same account"
              placeholderTextColor="#595959"
              secureTextEntry
              value={inputToken}
              onChangeText={setInputToken}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConnect}
              style={[styles.primaryConnectBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.primaryConnectBtnText}>Connect & Open Terminal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Connected Interactive Terminal View */
        <View style={styles.terminalContainer}>
          {/* Tool Permission Approval Banner */}
          {remoteSession.currentTool && remoteSession.currentTool.status === 'pending' && (
            <View style={styles.toolPromptBanner}>
              <View style={styles.toolPromptHeader}>
                <View style={styles.toolPromptTag}>
                  <Text style={[styles.toolPromptTagText, { fontFamily: monoFont }]}>
                    PERMISSION REQUIRED
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.toolPromptName, { fontFamily: monoFont }]}>
                  {remoteSession.currentTool.name}
                </Text>
              </View>
              <Text style={[styles.toolPromptDesc, { fontFamily: monoFont }]}>
                {remoteSession.currentTool.description}
              </Text>
              <View style={styles.toolPromptActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(false)}
                  style={styles.toolRejectBtn}>
                  <CloseIcon size={14} color="#FF4D4F" />
                  <Text style={[styles.toolRejectText, { fontFamily: monoFont }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(true)}
                  style={styles.toolApproveBtn}>
                  <CheckmarkIcon size={14} color="#FFFFFF" />
                  <Text style={[styles.toolApproveText, { fontFamily: monoFont }]}>Approve & Run</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Terminal Console Logs */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.terminalOutputBox}
            contentContainerStyle={styles.terminalOutputContent}
            keyboardShouldPersistTaps="handled">
            {/* Minimal Welcome Placeholder when empty */}
            {remoteSession.logs.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <RemoteIcon size={24} color="#52C41A" />
                </View>
                <Text style={[styles.emptyTitle, { fontFamily: monoFont }]}>
                  Laptop Connected
                </Text>
                <Text style={[styles.emptySubtitle, { fontFamily: monoFont }]}>
                  Type commands or instructions below to control your laptop terminal.
                </Text>
              </View>
            )}

            {/* Formatted Terminal Logs */}
            {remoteSession.logs.map((log, index) => renderLogItem(log, index))}
          </ScrollView>

          {/* Quick Command Chips */}
          <View style={styles.quickBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickBarScroll}>
              {['git status', 'git diff', 'ls -la', 'npm test'].map(cmd => (
                <TouchableOpacity
                  key={cmd}
                  activeOpacity={0.7}
                  onPress={() => handleQuickCommand(cmd)}
                  style={styles.quickChip}>
                  <Text style={[styles.quickChipText, { fontFamily: monoFont }]}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Interactive Command / Prompt Input Bar */}
          <View style={styles.inputBar}>
            <View style={styles.promptPrefix}>
              <Text style={[styles.promptPrefixText, { color: theme.primary, fontFamily: monoFont }]}>
                ❯
              </Text>
            </View>

            <TextInput
              style={[
                styles.cmdTextInput,
                {
                  color: '#FFFFFF',
                  fontFamily: monoFont,
                },
              ]}
              placeholder="Type prompt or command..."
              placeholderTextColor="#666666"
              value={commandText}
              onChangeText={setCommandText}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => handleSendCommand()}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!commandText.trim() || isSending}
              onPress={() => handleSendCommand()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: commandText.trim() ? theme.primary : '#21262D',
                },
              ]}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SendIcon size={16} color={commandText.trim() ? '#FFFFFF' : '#666666'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interruptBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF4D4F',
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
  },
  interruptBtnText: {
    color: '#FF4D4F',
    fontSize: 11,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#161B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairingContent: {
    padding: 16,
  },
  pairingCard: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
    gap: 12,
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
  },
  detectedCard: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#52C41A',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 6,
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
    backgroundColor: '#52C41A',
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  detectedId: {
    fontSize: 12,
  },
  quickConnectBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  quickConnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  terminalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  primaryConnectBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryConnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  terminalContainer: {
    flex: 1,
  },
  toolPromptBanner: {
    backgroundColor: '#1B1705',
    borderBottomWidth: 1,
    borderBottomColor: '#D48806',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  toolPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolPromptTag: {
    backgroundColor: '#FAAD14',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toolPromptTagText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  toolPromptName: {
    color: '#FFE58F',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  toolPromptDesc: {
    color: '#D9D9D9',
    fontSize: 12,
    lineHeight: 17,
  },
  toolPromptActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  toolRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 77, 79, 0.2)',
  },
  toolRejectText: {
    color: '#FF4D4F',
    fontWeight: '700',
    fontSize: 12,
  },
  toolApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#52C41A',
  },
  toolApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  terminalOutputBox: {
    flex: 1,
  },
  terminalOutputContent: {
    padding: 12,
    gap: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(82, 196, 26, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#8C8C8C',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  userCmdContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  userCmdBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(43, 127, 255, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#2B7FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  userCmdPrompt: {
    color: '#2B7FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  userCmdText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  toolCard: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 6,
    padding: 8,
    marginVertical: 2,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBadge: {
    backgroundColor: 'rgba(179, 127, 235, 0.2)',
    borderWidth: 1,
    borderColor: '#B37FEB',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  toolBadgeText: {
    color: '#D3ADF7',
    fontSize: 9,
    fontWeight: '700',
  },
  toolTitle: {
    color: '#D9D9D9',
    fontSize: 12,
    flex: 1,
  },
  runningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  runningText: {
    color: '#52C41A',
    fontSize: 12,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  doneText: {
    color: '#52C41A',
    fontSize: 12,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: 'rgba(250, 173, 20, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FAAD14',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
  },
  warningText: {
    color: '#FAAD14',
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4D4F',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
  },
  errorText: {
    color: '#FF7875',
    fontSize: 12,
  },
  logRow: {
    paddingVertical: 1,
  },
  logText: {
    color: '#C9D1D9',
    fontSize: 12.5,
    lineHeight: 18,
  },
  quickBar: {
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    paddingVertical: 6,
    backgroundColor: '#0D1117',
  },
  quickBarScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: '#30363D',
    backgroundColor: '#161B22',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  quickChipText: {
    color: '#8C8C8C',
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161B22',
    gap: 8,
  },
  promptPrefix: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  promptPrefixText: {
    fontSize: 16,
    fontWeight: '800',
  },
  cmdTextInput: {
    flex: 1,
    fontSize: 13.5,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
