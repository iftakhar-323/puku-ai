import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../../theme/theme';

interface TypingIndicatorProps {
  theme: ThemeColors;
}

export function TypingIndicator({ theme }: TypingIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
      {/* Puku Mascot Blob: small green/teal circle with 2 tiny eyes */}
      <View style={styles.mascotBlob}>
        <View style={styles.mascotEye} />
        <View style={styles.mascotEye} />
      </View>
      <Text style={[styles.thinkingText, { color: theme.textSecondary, fontFamily: monoFont }]}>
        Thinking...
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  mascotBlob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2AC595',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mascotEye: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0F483A',
  },
  thinkingText: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
});

