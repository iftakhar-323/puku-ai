import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  style,
  textStyle,
  children,
  ...props
}: ButtonProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const getContainerStyle = (): ViewStyle => {
    // Base size
    let paddingVertical = 10;
    let paddingHorizontal = 16;
    let minHeight = 40;
    let minWidth = 40;
    let borderRadius = 8;

    if (size === 'sm') {
      paddingVertical = 6;
      paddingHorizontal = 10;
      minHeight = 32;
      minWidth = 32;
      borderRadius = 6;
    } else if (size === 'lg') {
      paddingVertical = 14;
      paddingHorizontal = 20;
      minHeight = 48;
      borderRadius = 10;
    } else if (size === 'icon') {
      paddingVertical = 0;
      paddingHorizontal = 0;
      minHeight = 36;
      minWidth = 36;
      borderRadius = 8;
    }

    // Variant style
    let backgroundColor = theme.accent;
    let borderWidth = 0;
    let borderColor = 'transparent';

    switch (variant) {
      case 'secondary':
        backgroundColor = theme.cardBackground;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        borderWidth = 1;
        borderColor = theme.border;
        break;
      case 'ghost':
        backgroundColor = 'transparent';
        break;
      case 'destructive':
        backgroundColor = theme.error;
        break;
      case 'link':
        backgroundColor = 'transparent';
        paddingHorizontal = 0;
        paddingVertical = 0;
        minHeight = 0;
        minWidth = 0;
        break;
      case 'default':
      default:
        backgroundColor = theme.primary;
        break;
    }

    return {
      paddingVertical,
      paddingHorizontal,
      minHeight,
      minWidth: size === 'icon' ? minWidth : undefined,
      borderRadius,
      backgroundColor,
      borderWidth,
      borderColor,
      opacity: disabled ? 0.45 : 1,
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return theme.textPrimary;
      case 'destructive':
        return '#FFFFFF';
      case 'link':
        return theme.accent;
      case 'default':
      default:
        return '#FFFFFF';
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 13;
      case 'lg':
        return 16;
      case 'icon':
      case 'md':
      default:
        return 14;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[styles.base, getContainerStyle(), style]}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            { color: getTextColor(), fontSize: getFontSize() },
            textStyle,
          ]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function ButtonGroup({
  children,
  style,
  ...props
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.buttonGroup, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
