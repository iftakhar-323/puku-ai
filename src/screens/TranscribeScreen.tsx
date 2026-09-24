import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/common/AppHeader';
import {
  CheckmarkIcon,
  CopyIcon,
  MicIcon,
  SendIcon,
} from '../components/common/Icons';
import { useApp } from '../store/AppContext';

export function TranscribeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, sendMessage, navigate } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [transcript, setTranscript] = useState(
    'Welcome to Puku AI audio transcription. Press the microphone below to record speech and transcribe it to formatted text in real-time.'
  );

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setSeconds(0);
    } else {
      setIsRecording(false);
      setTranscript(
        'In today’s project review, we finalized the migration from Flutter to React Native. All screens including Chats, Projects, Artifacts, Code sessions, and Remote agent pairing are now fully functioning on Android and iOS.'
      );
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs
      .toString()
      .padStart(2, '0')}`;
  };

  const wordCount = transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleCopy = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleSendToChat = () => {
    sendMessage(transcript);
    navigate('chat');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader showBack title="Transcribe" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Waveform Card */}
        <View
          style={[
            styles.waveformCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <Text style={[styles.timerText, { color: theme.textPrimary }]}>
            {formatTimer(seconds)}
          </Text>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {isRecording ? 'Listening and capturing audio...' : 'Tap Mic to Start Recording'}
          </Text>

          {/* Animated visual waveform bars */}
          <View style={styles.barsRow}>
            {[24, 40, 18, 55, 32, 70, 45, 60, 28, 50, 35, 65, 20].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: isRecording ? Math.max(12, (h * (1 + (i % 3) * 0.4))) : 12,
                    backgroundColor: isRecording ? theme.primary : theme.buttonBackground,
                  },
                ]}
              />
            ))}
          </View>

          {/* Record Control Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleRecording}
            style={[
              styles.recordBtn,
              {
                backgroundColor: isRecording ? theme.error : theme.primary,
                shadowColor: isRecording ? theme.error : theme.primary,
              },
            ]}>
            <MicIcon size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Transcript Output Box */}
        <View
          style={[
            styles.transcriptCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Transcription Result
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.pillBackground },
              ]}>
              <Text style={[styles.badgeText, { color: theme.tagText }]}>
                {wordCount} words
              </Text>
            </View>
          </View>

          <Text style={[styles.transcriptText, { color: theme.textPrimary }]}>
            {transcript}
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.actionBtn, { backgroundColor: theme.buttonBackground }]}>
              {isCopied ? (
                <CheckmarkIcon size={16} color={theme.success} />
              ) : (
                <CopyIcon size={16} color={theme.tagText} />
              )}
              <Text style={[styles.actionText, { color: theme.tagText }]}>
                {isCopied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendToChat}
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
              <SendIcon size={16} color="#FFFFFF" />
              <Text style={[styles.actionText, { color: '#FFFFFF' }]}>
                Send to Chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  waveformCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  statusText: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
    fontWeight: '500',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 90,
    marginBottom: 24,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
  },
  recordBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  transcriptCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
