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
import { AppHeader } from '../../components/common/AppHeader';
import {
  CheckmarkIcon,
  CloseIcon,
  RemoteIcon,
  SendIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

export function RemoteSessionScreen() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const {
    theme,
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
    }, 100);
    return () => clearTimeout(timer);
  }, [remoteSession.logs, remoteSession.currentTool]);

  const isConnected = remoteSession.status === 'connected';

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* App Header with Terminal title and quick controls */}
      <AppHeader
        showBack
        title="puku-cli Remote"
        rightAction={
          isConnected ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={sendRemoteInterrupt}
                style={[styles.headerBtn, { backgroundColor: 'rgba(255, 77, 79, 0.15)' }]}>
                <Text style={[styles.headerBtnText, { color: '#FF4D4F', fontFamily: monoFont }]}>
                  ^C
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={clearRemoteLogs}
                style={[styles.headerBtn, { backgroundColor: theme.buttonBackground }]}>
                <Text style={[styles.headerBtnText, { color: theme.textSecondary, fontFamily: monoFont }]}>
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={disconnectRemoteSession}
                style={[styles.headerBtn, { backgroundColor: theme.buttonBackground }]}>
                <Text style={[styles.headerBtnText, { color: theme.error, fontFamily: monoFont }]}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Connection Status Pill Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: isConnected ? '#0F1E13' : theme.secondaryBackground,
            borderColor: isConnected ? '#237804' : theme.border,
          },
        ]}>
        <View style={styles.statusBannerLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#52C41A' : '#FAAD14' },
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.statusBannerTitle,
              { color: isConnected ? '#73D13D' : theme.textPrimary, fontFamily: monoFont },
            ]}>
            {isConnected ? 'LIVE RELAY ACTIVE' : 'DISCONNECTED FROM LAPTOP'}
          </Text>
        </View>
        {remoteSession.sessionId ? (
          <Text
            numberOfLines={1}
            style={[styles.statusSessionId, { color: theme.textSecondary, fontFamily: monoFont }]}>
            {remoteSession.sessionId.slice(0, 14)}...
          </Text>
        ) : null}
      </View>

      {/* Main Terminal Window or Pairing Form */}
      {!isConnected ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.pairingContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View
            style={[
              styles.pairingCard,
              { backgroundColor: theme.secondaryBackground, borderColor: theme.border },
            ]}>
            <View style={styles.pairingHeader}>
              <RemoteIcon size={24} color={theme.primary} />
              <Text style={[styles.pairingTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                Connect to Laptop CLI
              </Text>
            </View>

            {activeRelaySessions.length > 0 && (
              <View
                style={[
                  styles.detectedCard,
                  { backgroundColor: theme.cardBackground, borderColor: '#52C41A' },
                ]}>
                <View style={styles.detectedHeader}>
                  <View style={styles.liveDot} />
                  <Text style={[styles.detectedTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                    Active Laptop Session Detected
                  </Text>
                </View>
                <Text style={[styles.detectedId, { color: theme.textSecondary, fontFamily: monoFont }]}>
                  {activeRelaySessions[0].title || 'puku-cli'} · {activeRelaySessions[0].sessionId}
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

            <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: monoFont }]}>
              Relay Session ID
            </Text>
            <TextInput
              style={[
                styles.terminalInput,
                {
                  backgroundColor: theme.background,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  fontFamily: monoFont,
                },
              ]}
              placeholder="e.g. af689a1b-2858-..."
              placeholderTextColor={theme.placeholderText}
              value={inputSessionId}
              onChangeText={setInputSessionId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: monoFont }]}>
              Mobile Session Token (Optional)
            </Text>
            <TextInput
              style={[
                styles.terminalInput,
                {
                  backgroundColor: theme.background,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  fontFamily: monoFont,
                },
              ]}
              placeholder="Auto-resolved if logged into same account"
              placeholderTextColor={theme.placeholderText}
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
        <KeyboardAvoidingView
          style={styles.terminalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Tool Permission Approval Banner */}
          {remoteSession.currentTool && remoteSession.currentTool.status === 'pending' && (
            <View style={[styles.toolPromptBanner, { backgroundColor: '#1F1A0A', borderColor: '#D48806' }]}>
              <View style={styles.toolPromptHeader}>
                <View style={styles.toolPromptTag}>
                  <Text style={[styles.toolPromptTagText, { fontFamily: monoFont }]}>
                    PERMISSION REQUIRED
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.toolPromptName, { color: '#FFE58F', fontFamily: monoFont }]}>
                  {remoteSession.currentTool.name}
                </Text>
              </View>
              <Text style={[styles.toolPromptDesc, { color: '#D9D9D9', fontFamily: monoFont }]}>
                {remoteSession.currentTool.description}
              </Text>
              <View style={styles.toolPromptActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(false)}
                  style={[styles.toolRejectBtn, { backgroundColor: 'rgba(255, 77, 79, 0.2)' }]}>
                  <CloseIcon size={14} color="#FF4D4F" />
                  <Text style={[styles.toolRejectText, { fontFamily: monoFont }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => respondToTool(true)}
                  style={[styles.toolApproveBtn, { backgroundColor: '#52C41A' }]}>
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
            {/* Terminal Banner */}
            <View style={styles.terminalWelcome}>
              <Text style={[styles.terminalAscii, { color: '#4DD0E1', fontFamily: monoFont }]}>
                {` __          __  _                           \n` +
                 ` \\ \\        / / | |                          \n` +
                 `  \\ \\  /\\  / /__| | ___ ___  _ __ ___   ___  \n` +
                 `   \\ \\/  \\/ / _ \\ |/ __/ _ \\| '_ \` _ \\ / _ \\ \n` +
                 `    \\  /\\  /  __/ | (_| (_) | | | | | |  __/ \n` +
                 `     \\/  \\/ \\___|_|\\___\\___/|_| |_| |_|\\___| `}
              </Text>
              <Text style={[styles.terminalInfoLine, { color: '#73D13D', fontFamily: monoFont }]}>
                ● Connected to laptop session ({remoteSession.sessionId.slice(0, 8)}...)
              </Text>
              <Text style={[styles.terminalInfoLine, { color: '#8C8C8C', fontFamily: monoFont }]}>
                Type instructions below to control and edit code on your laptop.
              </Text>
            </View>

            {/* Log / Terminal lines */}
            {remoteSession.logs.map((log, index) => {
              const isUser = log.startsWith('>');
              const isWarning = log.includes('Warning') || log.includes('Required');
              const isError = log.includes('Error') || log.includes('REJECTED');
              const isDone = log.includes('✓');
              const isTool = log.includes('[Tool]') || log.includes('[Running]');

              return (
                <View
                  key={index}
                  style={[
                    styles.logLineContainer,
                    isUser && styles.userLogContainer,
                  ]}>
                  <Text
                    style={[
                      styles.logText,
                      { fontFamily: monoFont },
                      isUser
                        ? { color: '#4DD0E1', fontWeight: '700' }
                        : isWarning
                        ? { color: '#FAAD14' }
                        : isError
                        ? { color: '#FF7875' }
                        : isDone
                        ? { color: '#52C41A' }
                        : isTool
                        ? { color: '#B37FEB' }
                        : { color: '#D9D9D9' },
                    ]}>
                    {log}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Quick Command Chips */}
          <View style={[styles.quickBar, { backgroundColor: '#141414', borderColor: '#262626' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickBarScroll}>
              {['git status', 'ls -la', 'npm test', '/help', '^C'].map(cmd => (
                <TouchableOpacity
                  key={cmd}
                  activeOpacity={0.7}
                  onPress={() => handleQuickCommand(cmd)}
                  style={[
                    styles.quickChip,
                    cmd === '^C'
                      ? { backgroundColor: 'rgba(255, 77, 79, 0.2)', borderColor: '#FF4D4F' }
                      : { backgroundColor: '#1F1F1F', borderColor: '#303030' },
                  ]}>
                  <Text
                    style={[
                      styles.quickChipText,
                      {
                        color: cmd === '^C' ? '#FF4D4F' : '#A6A6A6',
                        fontFamily: monoFont,
                      },
                    ]}>
                    {cmd}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Interactive Command / Prompt Input Bar */}
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: '#141414',
                borderColor: '#303030',
                paddingBottom:
                  Platform.OS === 'android' && keyboardHeight > 0
                    ? 8
                    : Math.max(insets.bottom, 10),
              },
            ]}>
            <View style={styles.promptPrefix}>
              <Text style={[styles.promptPrefixText, { color: '#4DD0E1', fontFamily: monoFont }]}>
                {'>'}
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
              placeholder="Type prompt or command for laptop..."
              placeholderTextColor="#595959"
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
                  backgroundColor: commandText.trim() ? theme.primary : '#262626',
                },
              ]}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SendIcon size={16} color={commandText.trim() ? '#FFFFFF' : '#595959'} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  headerBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusSessionId: {
    fontSize: 11,
  },
  pairingContent: {
    padding: 16,
  },
  pairingCard: {
    borderRadius: 14,
    borderWidth: 1,
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
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 8,
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
    marginTop: 4,
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
    marginTop: 8,
  },
  primaryConnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  toolPromptBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
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
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  toolPromptDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  toolPromptActions: {
    flexDirection: 'row',
    gap: 10,
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
    paddingVertical: 8,
    borderRadius: 8,
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
    padding: 14,
    gap: 6,
  },
  terminalWelcome: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
    marginBottom: 8,
    gap: 4,
  },
  terminalAscii: {
    fontSize: 9,
    lineHeight: 11,
    marginBottom: 6,
  },
  terminalInfoLine: {
    fontSize: 11,
  },
  logLineContainer: {
    paddingVertical: 2,
  },
  userLogContainer: {
    backgroundColor: 'rgba(77, 208, 225, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: '#4DD0E1',
    paddingLeft: 8,
    borderRadius: 4,
    marginVertical: 4,
    paddingVertical: 6,
  },
  logText: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  quickBar: {
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  quickBarScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickChipText: {
    fontSize: 11,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  promptPrefix: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  promptPrefixText: {
    fontSize: 18,
    fontWeight: '800',
  },
  cmdTextInput: {
    flex: 1,
    fontSize: 13,
    maxHeight: 90,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
