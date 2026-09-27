import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Card({ style, children, ...props }: CardProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

export function CardHeader({
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
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

export function CardDescription({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
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

export function CardContent({
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    gap: 8,
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
