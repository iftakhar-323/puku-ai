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

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  style,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handleToggle}
      style={[
        styles.box,
        {
          borderColor: isChecked ? theme.accent : theme.border,
          backgroundColor: isChecked ? theme.accent : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {isChecked && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
});
