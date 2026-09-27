import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface ProgressProps {
  value?: number; // 0 to 100
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
}

export function Progress({
  value = 0,
  style,
  trackStyle,
  indicatorStyle,
}: ProgressProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const clampedValue = Math.min(100, Math.max(0, value));
  const animatedWidth = useRef(new Animated.Value(clampedValue)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [clampedValue, animatedWidth]);

  const widthPercent = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.track,
          { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
          trackStyle,
        ]}>
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.primaryLight || '#8B6BFF',
              width: widthPercent,
            },
            indicatorStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: 4,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  indicator: {
    height: '100%',
    borderRadius: 3,
  },
});
