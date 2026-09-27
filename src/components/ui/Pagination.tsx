import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export function Pagination({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.pagination, style]}>{children}</View>;
}

export function PaginationContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function PaginationItem({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.item, style]}>{children}</View>;
}

export function PaginationLink({
  active,
  disabled,
  children,
  onPress,
  style,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.link,
        {
          backgroundColor: active ? theme.cardBackground : 'transparent',
          borderColor: active ? theme.accent : 'transparent',
          borderWidth: active ? 1 : 0,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.linkText,
            {
              color: active ? theme.textPrimary : theme.textSecondary,
              fontWeight: active ? '700' : '500',
            },
          ]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pagination: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
  },
});
