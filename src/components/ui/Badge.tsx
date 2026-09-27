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

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive';

export interface BadgeProps {
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  style,
  textStyle,
  children,
}: BadgeProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const getVariantStyles = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'secondary':
        return { bg: theme.cardBackground, text: theme.textSecondary };
      case 'outline':
        return { bg: 'transparent', text: theme.textPrimary, border: theme.border };
      case 'success':
        return { bg: 'rgba(82, 196, 26, 0.15)', text: '#52C41A', border: 'rgba(82, 196, 26, 0.3)' };
      case 'warning':
        return { bg: 'rgba(250, 173, 20, 0.15)', text: '#FAAD14', border: 'rgba(250, 173, 20, 0.3)' };
      case 'destructive':
        return { bg: 'rgba(255, 77, 79, 0.15)', text: '#FF4D4F', border: 'rgba(255, 77, 79, 0.3)' };
      case 'default':
      default:
        return { bg: theme.pillBackground, text: theme.textPrimary };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border || 'transparent',
          borderWidth: vStyle.border ? 1 : 0,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: vStyle.text }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
