import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/common/AppHeader';
import {
  CloseIcon,
  CodeIcon,
  PlusIcon,
} from '../components/common/Icons';
import { useApp } from '../store/AppContext';
import { CodeSession } from '../types';

export function CodeScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    codeSessions,
    activeCodeSession,
    selectCodeSession,
    createCodeSession,
    runCodeSession,
  } = useApp();

  const [showNewModal, setShowNewModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [environment, setEnvironment] = useState('React Native / TypeScript');
  const [autoAccept, setAutoAccept] = useState(true);

  const [interactiveCode, setInteractiveCode] = useState(
    activeCodeSession?.code || ''
  );

  const handleStartSession = () => {
    if (!prompt.trim()) return;
    const session = createCodeSession(
      prompt.trim(),
      environment,
      autoAccept
    );
    setInteractiveCode(session.code || '');
    setPrompt('');
    setShowNewModal(false);
  };

  const handleRun = () => {
    if (!activeCodeSession) return;
    runCodeSession(activeCodeSession.id, interactiveCode);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        showBack
        title="Code Sessions"
        rightAction={
          <TouchableOpacity
            onPress={() => setShowNewModal(true)}
            style={[styles.newBtn, { backgroundColor: theme.primary }]}>
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Suggested Connect Integrations Card */}
        <View
          style={[
            styles.suggestedCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <Text style={[styles.suggestedTitle, { color: theme.textMuted }]}>
            SUGGESTED INTEGRATIONS
          </Text>
          <View style={styles.integrationRow}>
            <View style={styles.integrationItem}>
              <Text style={[styles.integrationName, { color: theme.textPrimary }]}>
                GitHub
              </Text>
              <Text style={[styles.integrationStatus, { color: theme.success }]}>
                Connected
              </Text>
            </View>
            <View style={styles.integrationItem}>
              <Text style={[styles.integrationName, { color: theme.textPrimary }]}>
                Figma
              </Text>
              <Text style={[styles.integrationStatus, { color: theme.textMuted }]}>
                Available
              </Text>
            </View>
          </View>
        </View>

        {/* Sessions list */}
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
          Active Sessions
        </Text>
        <View style={styles.sessionsList}>
          {codeSessions.map(session => {
            const isSelected = activeCodeSession?.id === session.id;
            return (
              <TouchableOpacity
                key={session.id}
                onPress={() => {
                  selectCodeSession(session.id);
                  setInteractiveCode(session.code || '');
                }}
                activeOpacity={0.7}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: theme.secondaryBackground,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}>
                <View style={styles.sessionHeader}>
                  <Text
                    numberOfLines={1}
                    style={[styles.sessionTitle, { color: theme.textPrimary }]}>
                    {session.title}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          session.status === 'running'
                            ? theme.warning
                            : theme.pillBackground,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            session.status === 'running'
                              ? '#FFFFFF'
                              : theme.tagText,
                        },
                      ]}>
                      {session.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                  {session.environment} • {session.lastActivity}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live Code Editor & Terminal Runner */}
        {activeCodeSession && (
          <View
            style={[
              styles.runnerCard,
              {
                backgroundColor: theme.codeBackground,
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.runnerHeader}>
              <View style={styles.terminalDots}>
                <View style={[styles.dot, { backgroundColor: '#FF5F56' }]} />
                <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
                <View style={[styles.dot, { backgroundColor: '#27C93F' }]} />
              </View>
              <Text style={styles.runnerTitle}>{activeCodeSession.title}</Text>
              <TouchableOpacity
                onPress={handleRun}
                style={[styles.runBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.runBtnText}>Run Code</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.codeEditor}
              multiline
              value={interactiveCode}
              onChangeText={setInteractiveCode}
              placeholderTextColor="#666"
            />

            {/* Terminal Output */}
            <View style={styles.terminalConsole}>
              <Text style={styles.consoleHeader}>TERMINAL OUTPUT</Text>
              {activeCodeSession.terminalOutput?.map((line, idx) => (
                <Text key={idx} style={styles.consoleLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* New Code Session Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowNewModal(false)}>
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
              New Code Session
            </Text>
            <TouchableOpacity onPress={() => setShowNewModal(false)}>
              <CloseIcon size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Describe what you want to build
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            placeholder="e.g. Build an animated bottom navigation bar with fluid transitions..."
            placeholderTextColor={theme.placeholderText}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>
                Accept edits automatically
              </Text>
              <Text style={[styles.switchSubtitle, { color: theme.textSecondary }]}>
                Puku will apply code changes without manual confirmation
              </Text>
            </View>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: theme.outline, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            onPress={handleStartSession}
            style={[styles.startBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 6,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  suggestedCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  integrationRow: {
    flexDirection: 'row',
    gap: 14,
  },
  integrationItem: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 71, 235, 0.05)',
  },
  integrationName: {
    fontSize: 14,
    fontWeight: '700',
  },
  integrationStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionMeta: {
    fontSize: 13,
  },
  runnerCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  runnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#120F24',
    borderBottomWidth: 1,
    borderBottomColor: '#26223D',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  runnerTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  runBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  runBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  codeEditor: {
    minHeight: 120,
    padding: 14,
    color: '#A5A5FF',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  terminalConsole: {
    backgroundColor: '#07050F',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#26223D',
  },
  consoleHeader: {
    color: '#87868E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  consoleLine: {
    color: '#52C41A',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 17,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textArea: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 14,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  startBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
