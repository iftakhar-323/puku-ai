import React, { createContext, useContext, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

interface ToggleGroupContextType {
  value: string | string[];
  type: 'single' | 'multiple';
  onValueChange: (val: string) => void;
}

const ToggleGroupContext = createContext<ToggleGroupContextType | null>(null);

export interface ToggleProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  value?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function Toggle({
  pressed: controlledPressed,
  defaultPressed = false,
  onPressedChange,
  value,
  disabled,
  style,
  textStyle,
  children,
}: ToggleProps) {
  const group = useContext(ToggleGroupContext);
  const [internalPressed, setInternalPressed] = useState(defaultPressed);

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const isPressed = group && value
    ? Array.isArray(group.value)
      ? group.value.includes(value)
      : group.value === value
    : controlledPressed !== undefined
    ? controlledPressed
    : internalPressed;

  const handlePress = () => {
    if (disabled) return;
    if (group && value) {
      group.onValueChange(value);
    } else {
      const next = !isPressed;
      if (controlledPressed === undefined) {
        setInternalPressed(next);
      }
      onPressedChange?.(next);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.toggle,
        {
          backgroundColor: isPressed ? theme.cardBackground : 'transparent',
          borderColor: isPressed ? theme.accent : theme.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            { color: isPressed ? theme.textPrimary : theme.textSecondary },
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

export const ToggleGroupItem = Toggle;

export interface ToggleGroupProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (val: any) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ToggleGroup({
  type = 'single',
  value: controlledValue,
  defaultValue = type === 'single' ? '' : [],
  onValueChange,
  style,
  children,
}: ToggleGroupProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    let nextValue: string | string[];
    if (type === 'single') {
      nextValue = activeValue === val ? '' : val;
    } else {
      const arr = Array.isArray(activeValue) ? [...activeValue] : [];
      if (arr.includes(val)) {
        nextValue = arr.filter(v => v !== val);
      } else {
        nextValue = [...arr, val];
      }
    }

    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <ToggleGroupContext.Provider
      value={{ value: activeValue, type, onValueChange: handleValueChange }}>
      <View style={[styles.group, style]}>{children}</View>
    </ToggleGroupContext.Provider>
  );
}

const styles = StyleSheet.create({
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
