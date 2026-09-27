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

interface AccordionContextType {
  value: string[];
  onToggle: (itemValue: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

export interface AccordionProps {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Accordion({
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  style,
  children,
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue);
  const activeValue = value !== undefined ? value : internalValue;

  const handleToggle = (itemValue: string) => {
    let next: string[];
    if (activeValue.includes(itemValue)) {
      next = multiple ? activeValue.filter(v => v !== itemValue) : [];
    } else {
      next = multiple ? [...activeValue, itemValue] : [itemValue];
    }
    if (value === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  return (
    <AccordionContext.Provider value={{ value: activeValue, onToggle: handleToggle }}>
      <View style={[styles.accordion, style]}>{children}</View>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextType {
  itemValue: string;
  isOpen: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(null);

export interface AccordionItemProps {
  value: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionItem({ value, style, children }: AccordionItemProps) {
  const ctx = useContext(AccordionContext);
  const isOpen = ctx ? ctx.value.includes(value) : false;

  return (
    <AccordionItemContext.Provider value={{ itemValue: value, isOpen }}>
      <View style={[styles.accordionItem, style]}>{children}</View>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AccordionTrigger({ style, textStyle, children }: AccordionTriggerProps) {
  const accordionCtx = useContext(AccordionContext);
  const itemCtx = useContext(AccordionItemContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const isOpen = itemCtx?.isOpen ?? false;

  const handlePress = () => {
    if (itemCtx && accordionCtx) {
      accordionCtx.onToggle(itemCtx.itemValue);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.accordionTrigger, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.triggerText, { color: theme.textPrimary }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
      <Text
        style={[
          styles.chevron,
          {
            color: theme.textSecondary,
            transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
          },
        ]}>
        ⌄
      </Text>
    </TouchableOpacity>
  );
}

export interface AccordionContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionContent({ style, children }: AccordionContentProps) {
  const itemCtx = useContext(AccordionItemContext);
  if (!itemCtx?.isOpen) return null;

  return <View style={[styles.accordionPanel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  accordion: {
    width: '100%',
  },
  accordionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  accordionTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  accordionPanel: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
