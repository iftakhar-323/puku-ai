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

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = createContext<TabsContextType>({
  value: '',
  onValueChange: () => {},
});

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  style,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <View style={[styles.root, style]}>{children}</View>
    </TabsContext.Provider>
  );
}

export function TabsList({
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
        styles.list,
        {
          backgroundColor: theme.pillBackground,
          borderColor: theme.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function TabsTrigger({
  value,
  disabled,
  style,
  textStyle,
  children,
}: {
  value: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;

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
        styles.trigger,
        {
          backgroundColor: isActive ? theme.cardBackground : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.triggerText,
            {
              color: isActive ? theme.textPrimary : theme.textSecondary,
              fontWeight: isActive ? '700' : '500',
            },
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

export function TabsContent({
  value,
  style,
  children,
}: {
  value: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;

  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  list: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    alignItems: 'center',
  },
  trigger: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: 13,
  },
  content: {
    marginTop: 12,
  },
});
