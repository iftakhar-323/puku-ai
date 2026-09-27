import React, { createContext, useContext, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

interface RadioContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const RadioContext = createContext<RadioContextType>({
  value: '',
  onValueChange: () => {},
});

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  style,
  children,
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <RadioContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <View style={[styles.group, style]}>{children}</View>
    </RadioContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  disabled,
  style,
}: {
  value: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { value: activeValue, onValueChange } = useContext(RadioContext);
  const isSelected = activeValue === value;

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onValueChange(value)}
      style={[
        styles.circle,
        {
          borderColor: isSelected ? theme.accent : theme.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {isSelected && (
        <View
          style={[
            styles.dot,
            { backgroundColor: theme.accent },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
