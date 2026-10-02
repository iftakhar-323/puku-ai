import React, { useEffect, useState, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CloseIcon,
  LiveVoiceIcon,
  MicIcon,
} from '../../components/common/Icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../store/AppContext';
import { NativeSpeech, NativeTts } from '../../services/nativeModules';

type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export function LiveVoiceScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { goBack, sendMessage, isGenerating, activeConversation } = useApp();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [lastReply, setLastReply] = useState('');
  const [errorText, setErrorText] = useState('');

  // One Animated.Value for the screen's lifetime; a new one per render detaches the loop.
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Wire the real conversation loop: listen -> send to Puku AI -> speak the
  // reply -> back to idle, ready for the next tap.
  useEffect(() => {
    const unsubResults = NativeSpeech.onSpeechResults(text => {
      if (text.trim()) {
        setVoiceStatus('thinking');
        sendMessage(text);
      } else {
        setVoiceStatus('idle');
      }
    });

    const unsubEnd = NativeSpeech.onSpeechEnd(() => {
      // onSpeechResults fires right after; only fall back to idle if it
      // never arrives (e.g. silence timeout with no final result).
      setVoiceStatus(curr => (curr === 'listening' ? 'idle' : curr));
    });

    const unsubSpeechError = NativeSpeech.onSpeechError(err => {
      setErrorText(err.message);
      setVoiceStatus('error');
    });

    const unsubTtsDone = NativeTts.onDone(() => setVoiceStatus('idle'));
    const unsubTtsError = NativeTts.onError(() => setVoiceStatus('idle'));

    return () => {
      unsubResults();
      unsubEnd();
      unsubSpeechError();
      unsubTtsDone();
      unsubTtsError();
      NativeSpeech.cancelListening();
      NativeTts.stop();
    };
  }, [sendMessage]);

  // Speak the reply once generation finishes.
  const wasGenerating = useRef(false);
  useEffect(() => {
    if (wasGenerating.current && !isGenerating) {
      const last = activeConversation?.messages[activeConversation.messages.length - 1];
      if (last && last.role === 'assistant' && last.content.trim()) {
        setLastReply(last.content);
        setVoiceStatus('speaking');
        NativeTts.speak(last.content);
      } else {
        setVoiceStatus('idle');
      }
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating, activeConversation]);

  const handleMicPress = async () => {
    if (voiceStatus === 'idle' || voiceStatus === 'error') {
      setErrorText('');
      const started = await NativeSpeech.startListening();
      setVoiceStatus(started ? 'listening' : 'error');
      if (!started) setErrorText(t('liveVoice.recognitionUnavailable'));
    } else if (voiceStatus === 'listening') {
      await NativeSpeech.stopListening();
    } else if (voiceStatus === 'speaking') {
      await NativeTts.stop();
      setVoiceStatus('idle');
    }
  };

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'idle':
        return t('liveVoice.tapToTalk');
      case 'listening':
        return t('liveVoice.listening');
      case 'thinking':
        return t('liveVoice.thinking');
      case 'speaking':
        return t('liveVoice.speaking');
      case 'error':
        return t('liveVoice.error');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#0B0817', // Deep immersive space black for live voice
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.badge}>
          <LiveVoiceIcon size={18} color="#A5A5FF" />
          <Text style={styles.badgeText}>{t('liveVoice.badge')}</Text>
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={goBack} style={styles.closeBtn}>
          <CloseIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Center Voice Orb Visualizer */}
      <View style={styles.orbContainer}>
        {/* Outer pulsating rings */}
        <Animated.View
          style={[
            styles.outerPulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: voiceStatus === 'listening' ? 0.35 : 0.6,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.middlePulseRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        {/* Core Glowing Orb */}
        <View
          style={[
            styles.coreOrb,
            {
              backgroundColor:
                voiceStatus === 'speaking'
                  ? '#8B6BFF'
                  : voiceStatus === 'thinking'
                  ? '#FAAD14'
                  : voiceStatus === 'error'
                  ? '#FF4D4F'
                  : '#6C47EB',
            },
          ]}>
          <LiveVoiceIcon size={44} color="#FFFFFF" />
        </View>

        <Text style={styles.statusTitle}>{getStatusText()}</Text>
        <Text style={styles.subtext}>
          {voiceStatus === 'error'
            ? errorText || t('liveVoice.subtextErrorFallback')
            : voiceStatus === 'speaking' && lastReply
            ? lastReply
            : t('liveVoice.subtextIdle')}
        </Text>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          onPress={() => setIsSpeakerOn(!isSpeakerOn)}
          style={[
            styles.controlBtn,
            { backgroundColor: isSpeakerOn ? '#201C59' : '#151125' },
          ]}>
          <Text style={styles.controlBtnText}>
            {isSpeakerOn ? t('liveVoice.speakerOn') : t('liveVoice.speakerOff')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voice input"
          accessibilityState={{ disabled: voiceStatus === 'thinking' }}
          disabled={voiceStatus === 'thinking'}
          onPress={handleMicPress}
          style={[
            styles.micBtn,
            {
              backgroundColor: voiceStatus === 'listening' ? '#FF4D4F' : '#6C47EB',
              opacity: voiceStatus === 'thinking' ? 0.5 : 1,
            },
          ]}>
          <MicIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goBack}
          style={[styles.controlBtn, { backgroundColor: '#FF4D4F' }]}>
          <Text style={[styles.controlBtnText, { color: '#FFFFFF' }]}>
            {t('liveVoice.end')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E1738',
    gap: 8,
  },
  badgeText: {
    color: '#A5A5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1738',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerPulseRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(108, 71, 235, 0.25)',
  },
  middlePulseRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(165, 165, 255, 0.2)',
  },
  coreOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 16,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 48,
    letterSpacing: -0.4,
  },
  subtext: {
    color: '#87868E',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: 20,
  },
  controlBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    color: '#A5A5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
