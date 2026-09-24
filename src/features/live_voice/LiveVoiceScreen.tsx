import React, { useEffect, useState } from 'react';
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
import { useApp } from '../../store/AppContext';

export function LiveVoiceScreen() {
  const insets = useSafeAreaInsets();
  const { theme, goBack } = useApp();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState<
    'listening' | 'thinking' | 'speaking'
  >('listening');

  const pulseAnim = new Animated.Value(1);

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

    // Cycle through live voice states to demonstrate natural conversation
    const timer = setInterval(() => {
      setVoiceStatus(curr => {
        if (curr === 'listening') return 'thinking';
        if (curr === 'thinking') return 'speaking';
        return 'listening';
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'listening':
        return 'Start talking...';
      case 'thinking':
        return 'Puku is thinking...';
      case 'speaking':
        return 'Puku is responding...';
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
          <Text style={styles.badgeText}>LIVE CONVERSATION</Text>
        </View>

        <TouchableOpacity onPress={goBack} style={styles.closeBtn}>
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
                  : '#6C47EB',
            },
          ]}>
          <LiveVoiceIcon size={44} color="#FFFFFF" />
        </View>

        <Text style={styles.statusTitle}>{getStatusText()}</Text>
        <Text style={styles.subtext}>
          {voiceStatus === 'speaking'
            ? '“I can help you build and deploy mobile features with ease.”'
            : 'Natural real-time low latency audio'}
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
            {isSpeakerOn ? '🔊 Speaker' : '🔈 Ear'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsMuted(!isMuted)}
          style={[
            styles.micBtn,
            { backgroundColor: isMuted ? '#FF4D4F' : '#6C47EB' },
          ]}>
          <MicIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goBack}
          style={[styles.controlBtn, { backgroundColor: '#FF4D4F' }]}>
          <Text style={[styles.controlBtnText, { color: '#FFFFFF' }]}>
            End
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
