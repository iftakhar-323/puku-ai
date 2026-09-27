import React, { useRef, useState } from 'react';
import {
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (val: number) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled = false,
  style,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [trackWidth, setTrackWidth] = useState(200);

  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const clamp = (v: number) => Math.min(Math.max(v, min), max);

  const calculateValueFromPosition = (x: number) => {
    if (trackWidth <= 0) return min;
    const ratio = Math.max(0, Math.min(x / trackWidth, 1));
    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    return clamp(steppedVal);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: evt => {
        const val = calculateValueFromPosition(evt.nativeEvent.locationX);
        if (controlledValue === undefined) setInternalValue(val);
        onValueChange?.(val);
      },
      onPanResponderMove: evt => {
        const val = calculateValueFromPosition(evt.nativeEvent.locationX);
        if (controlledValue === undefined) setInternalValue(val);
        onValueChange?.(val);
      },
    })
  ).current;

  const percentage = max > min ? ((activeValue - min) / (max - min)) * 100 : 0;

  return (
    <View
      style={[styles.container, style]}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.pillBackground },
        ]}>
        <View
          style={[
            styles.indicator,
            {
              width: `${percentage}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${percentage}%`,
              backgroundColor: '#FFFFFF',
              borderColor: theme.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  indicator: {
    height: '100%',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginLeft: -9,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
