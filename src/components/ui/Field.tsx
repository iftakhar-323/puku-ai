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

export function Field({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.field, style]}>{children}</View>;
}

export function FieldLabel({
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
    <Text style={[styles.label, { color: theme.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export function FieldDescription({
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

export function FieldError({
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

  if (!children) return null;

  return (
    <Text style={[styles.error, { color: theme.error }, style]}>
      {children}
    </Text>
  );
}

export const FieldControl = View;

export function Fieldset({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.fieldset,
        { borderColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function FieldsetLegend({
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
    <Text style={[styles.legend, { color: theme.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export function FieldsetDescription({
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

const styles = StyleSheet.create({
  field: {
    gap: 4,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
  },
  fieldset: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  legend: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
});
