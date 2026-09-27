import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

interface ComboboxContextType {
  open: boolean;
  setOpen: (val: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  value: string;
  onValueChange: (val: string) => void;
}

const ComboboxContext = createContext<ComboboxContextType>({
  open: false,
  setOpen: () => {},
  query: '',
  setQuery: () => {},
  value: '',
  onValueChange: () => {},
});

export interface ComboboxProps {
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}

export function Combobox({
  value: controlledValue,
  onValueChange,
  children,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [internalValue, setInternalValue] = useState('');

  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <ComboboxContext.Provider
      value={{
        open,
        setOpen,
        query,
        setQuery,
        value: activeValue,
        onValueChange: handleValueChange,
      }}>
      <View style={styles.root}>{children}</View>
    </ComboboxContext.Provider>
  );
}

export function ComboboxInput({
  placeholder = 'Search or select...',
  style,
}: {
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen, query, setQuery, value } = useContext(ComboboxContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TextInput
      value={query || value}
      placeholder={placeholder}
      placeholderTextColor={theme.placeholderText}
      onFocus={() => setOpen(true)}
      onChangeText={text => {
        setQuery(text);
        setOpen(true);
      }}
      style={[
        styles.input,
        {
          backgroundColor: theme.secondaryBackground,
          borderColor: theme.border,
          color: theme.textPrimary,
        },
        style as any,
      ]}
    />
  );
}

export function ComboboxContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen } = useContext(ComboboxContext);
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
                style={{ maxHeight: 280 }}
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

export const ComboboxList = View;

export function ComboboxEmpty({ children }: { children: React.ReactNode }) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={styles.empty}>
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function ComboboxItem({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { value: selectedValue, onValueChange } = useContext(ComboboxContext);
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
  root: {
    width: '100%',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '84%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  empty: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
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
