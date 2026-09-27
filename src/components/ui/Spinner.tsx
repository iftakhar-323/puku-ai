import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface SpinnerProps {
  label?: string;
  size?: 'small' | 'large';
  color?: string;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Spinner({
  label = 'Loading',
  size = 'small',
  color,
  showLabel = false,
  style,
}: SpinnerProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const activeColor = color || theme.primaryLight || '#8B6BFF';

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.container, style]}>
      <ActivityIndicator size={size} color={activeColor} />
      {showLabel && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  label: {
    marginLeft: 8,
    fontSize: 13,
  },
});
