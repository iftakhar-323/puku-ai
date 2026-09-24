import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/common/AppHeader';
import {
  CheckmarkIcon,
  CloseIcon,
  RemoteIcon,
} from '../components/common/Icons';
import { useApp } from '../store/AppContext';

export function RemoteSessionScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    remoteSession,
    connectRemoteSession,
    disconnectRemoteSession,
    respondToTool,
  } = useApp();

  const [inputSessionId, setInputSessionId] = useState(remoteSession.sessionId);
  const [inputToken, setInputToken] = useState(remoteSession.token);

  const isConnected = remoteSession.status === 'connected';

  const handleConnect = () => {
    if (!inputSessionId.trim() || !inputToken.trim()) return;
    connectRemoteSession(inputSessionId.trim(), inputToken.trim());
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        showBack
        title="Remote Agent Relay"
        rightAction={
          isConnected ? (
            <TouchableOpacity
              onPress={disconnectRemoteSession}
              style={[styles.disconnectBtn, { backgroundColor: theme.buttonBackground }]}>
              <Text style={[styles.disconnectText, { color: theme.error }]}>
                Disconnect
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Pairing / Connection Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.cardHeader}>
            <RemoteIcon size={24} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Desktop Pairing
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isConnected
                    ? 'rgba(82, 196, 26, 0.15)'
                    : 'rgba(250, 173, 20, 0.15)',
                },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  { color: isConnected ? theme.success : theme.warning },
                ]}>
                {remoteSession.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {!isConnected ? (
            <View style={styles.pairingForm}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Relay Session ID
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="puku-relay-xxxx"
                placeholderTextColor={theme.placeholderText}
                value={inputSessionId}
                onChangeText={setInputSessionId}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Session Token
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="tk_live_xxxx"
                placeholderTextColor={theme.placeholderText}
                secureTextEntry
                value={inputToken}
                onChangeText={setInputToken}
              />

              <TouchableOpacity
                onPress={handleConnect}
                style={[styles.connectBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.connectBtnText}>Connect Remote Agent</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.connectedInfo}>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Linked to session:{' '}
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>
                  {remoteSession.sessionId}
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Tool Execution Approval Card */}
        {isConnected && remoteSession.currentTool && (
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.primary,
              },
            ]}>
            <View style={styles.toolHeader}>
              <Text style={[styles.toolBadge, { color: theme.primary }]}>
                PERMISSION REQUEST
              </Text>
              <Text style={[styles.toolName, { color: theme.textPrimary }]}>
                {remoteSession.currentTool.name}
              </Text>
            </View>
            <Text style={[styles.toolDesc, { color: theme.textSecondary }]}>
              {remoteSession.currentTool.description}
            </Text>

            {remoteSession.currentTool.status === 'pending' ? (
              <View style={styles.toolActions}>
                <TouchableOpacity
                  onPress={() => respondToTool(false)}
                  style={[
                    styles.toolBtn,
                    { backgroundColor: theme.buttonBackground },
                  ]}>
                  <CloseIcon size={16} color={theme.error} />
                  <Text style={[styles.toolBtnText, { color: theme.error }]}>
                    Reject
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => respondToTool(true)}
                  style={[styles.toolBtn, { backgroundColor: theme.primary }]}>
                  <CheckmarkIcon size={16} color="#FFFFFF" />
                  <Text style={[styles.toolBtnText, { color: '#FFFFFF' }]}>
                    Allow Tool
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text
                style={[
                  styles.toolStatusDone,
                  {
                    color:
                      remoteSession.currentTool.status === 'approved'
                        ? theme.success
                        : theme.error,
                  },
                ]}>
                Status: {remoteSession.currentTool.status.toUpperCase()}
              </Text>
            )}
          </View>
        )}

        {/* Diff Lines View */}
        {isConnected && remoteSession.diffLines && (
          <View
            style={[
              styles.diffCard,
              {
                backgroundColor: theme.codeBackground,
                borderColor: theme.border,
              },
            ]}>
            <Text style={styles.diffHeader}>WORKSPACE CODE DIFF</Text>
            {remoteSession.diffLines.map((line, idx) => (
              <View
                key={idx}
                style={[
                  styles.diffRow,
                  line.type === 'add' && styles.diffAdd,
                  line.type === 'remove' && styles.diffRemove,
                ]}>
                <Text
                  style={[
                    styles.diffLineText,
                    line.type === 'add' && { color: '#52C41A' },
                    line.type === 'remove' && { color: '#FF4D4F' },
                    line.type === 'context' && { color: '#87868E' },
                  ]}>
                  {line.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Live Relay Logs */}
        <View
          style={[
            styles.logsCard,
            {
              backgroundColor: theme.codeBackground,
              borderColor: theme.border,
            },
          ]}>
          <Text style={styles.logsHeader}>RELAY LOGS</Text>
          {remoteSession.logs.map((log, index) => (
            <Text key={index} style={styles.logLine}>
              {log}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  disconnectText: {
    fontSize: 12,
    fontWeight: '700',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pairingForm: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  connectBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  connectedInfo: {
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
  },
  toolCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  toolHeader: {
    marginBottom: 6,
  },
  toolBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  toolDesc: {
    fontSize: 13,
    marginBottom: 14,
  },
  toolActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toolBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toolBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toolStatusDone: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  diffCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  diffHeader: {
    color: '#87868E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  diffRow: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  diffAdd: {
    backgroundColor: 'rgba(82, 196, 26, 0.15)',
  },
  diffRemove: {
    backgroundColor: 'rgba(255, 77, 79, 0.15)',
  },
  diffLineText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  logsCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  logsHeader: {
    color: '#87868E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  logLine: {
    color: '#A5A5FF',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
