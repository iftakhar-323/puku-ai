import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface AlertProps {
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Alert({
  variant = 'default',
  style,
  children,
}: AlertProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const getBorderColor = () => {
    switch (variant) {
      case 'success':
        return '#52C41A';
      case 'warning':
        return '#FAAD14';
      case 'destructive':
        return '#FF4D4F';
      case 'default':
      default:
        return theme.border;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return 'rgba(82, 196, 26, 0.1)';
      case 'warning':
        return 'rgba(250, 173, 20, 0.1)';
      case 'destructive':
        return 'rgba(255, 77, 79, 0.1)';
      case 'default':
      default:
        return theme.secondaryBackground;
    }
  };

  return (
    <View
      style={[
        styles.alert,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export interface AlertTitleProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertTitle({ style, children }: AlertTitleProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <Text style={[styles.title, { color: theme.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export interface AlertDescriptionProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDescription({ style, children }: AlertDescriptionProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <Text style={[styles.description, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  alert: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
