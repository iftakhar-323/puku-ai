import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface SwitchProps {
  checked?: boolean;
  value?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onValueChange?: (val: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  trackColor?: any;
  thumbColor?: any;
}

export function Switch({
  checked: controlledChecked,
  value: controlledValue,
  defaultChecked = false,
  onCheckedChange,
  onValueChange,
  disabled = false,
  style,
}: SwitchProps) {
  const effectiveChecked =
    controlledChecked !== undefined
      ? controlledChecked
      : controlledValue !== undefined
      ? controlledValue
      : undefined;

  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = effectiveChecked !== undefined ? effectiveChecked : internalChecked;

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const anim = useRef(new Animated.Value(isChecked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isChecked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isChecked, anim]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined && controlledValue === undefined) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
    onValueChange?.(next);
  };

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.pillBackground, theme.accent],
  });

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleToggle}
      disabled={disabled}
      style={[styles.touchTarget, { opacity: disabled ? 0.4 : 1 }]}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBg,
            borderColor: theme.border,
          },
          style,
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    padding: 4,
  },
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
