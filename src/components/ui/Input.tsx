import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Input({
  invalid = false,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const borderColor = invalid
    ? theme.error
    : isFocused
    ? theme.accent
    : theme.border;

  return (
    <TextInput
      placeholderTextColor={theme.placeholderText}
      style={[
        styles.input,
        {
          backgroundColor: theme.secondaryBackground,
          borderColor,
          color: theme.textPrimary,
        },
        style,
      ]}
      onFocus={e => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={e => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

export function Textarea({
  invalid = false,
  style,
  numberOfLines = 4,
  ...props
}: InputProps) {
  return (
    <Input
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      invalid={invalid}
      style={[styles.textarea, style]}
      {...props}
    />
  );
}

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
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

export function InputGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.inputGroup,
        {
          borderColor: theme.border,
          backgroundColor: theme.secondaryBackground,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function InputGroupAddon({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.addon,
        {
          backgroundColor: theme.pillBackground,
          borderColor: theme.border,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export function InputGroupInput(props: InputProps) {
  return (
    <TextInput
      style={styles.groupInput}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textarea: {
    height: 96,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addon: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  groupInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});
