import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

interface SelectContextType {
  open: boolean;
  setOpen: (val: boolean) => void;
  value: string;
  onValueChange: (val: string) => void;
}

const SelectContext = createContext<SelectContextType>({
  open: false,
  setOpen: () => {},
  value: '',
  onValueChange: () => {},
});

export interface SelectProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}

export function Select({
  open: controlledOpen,
  onOpenChange,
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
}: SelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleOpen = (val: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
  };

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    handleOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        open: isOpen,
        setOpen: handleOpen,
        value: activeValue,
        onValueChange: handleValueChange,
      }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function SelectLabel({
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
    <Text style={[styles.label, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

export function SelectTrigger({
  placeholder = 'Select option...',
  children,
  style,
}: {
  placeholder?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen, value } = useContext(SelectContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setOpen(!open)}
      style={[
        styles.trigger,
        {
          backgroundColor: theme.secondaryBackground,
          borderColor: theme.border,
        },
        style,
      ]}>
      <Text
        style={[
          styles.triggerText,
          { color: value || children ? theme.textPrimary : theme.placeholderText },
        ]}>
        {children || value || placeholder}
      </Text>
      <Text style={[styles.arrow, { color: theme.textSecondary }]}>⌄</Text>
    </TouchableOpacity>
  );
}

export function SelectValue({
  placeholder = 'Select option...',
}: {
  placeholder?: string;
}) {
  const { value } = useContext(SelectContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <Text style={{ color: value ? theme.textPrimary : theme.placeholderText }}>
      {value || placeholder}
    </Text>
  );
}

export function SelectContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen } = useContext(SelectContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.popup,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
                style,
              ]}>
              <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export function SelectItem({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { value: selectedValue, onValueChange } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onValueChange(value)}
      style={[
        styles.item,
        { backgroundColor: isSelected ? theme.pillBackground : 'transparent' },
        style,
      ]}>
      <Text style={[styles.check, { color: isSelected ? theme.accent : 'transparent' }]}>
        ✓
      </Text>
      <Text
        style={[
          styles.itemText,
          { color: isSelected ? theme.textPrimary : theme.textSecondary },
        ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '84%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  group: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingVertical: 4,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 8,
  },
  check: {
    fontSize: 14,
    width: 16,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
