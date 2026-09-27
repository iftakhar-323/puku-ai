import React, { createContext, useContext, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface CollapsibleContextType {
  open: boolean;
  onToggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | null>(null);

export interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  style,
  children,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onToggle: handleToggle }}>
      <View style={[styles.collapsible, style]}>{children}</View>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleTriggerProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function CollapsibleTrigger({ style, children }: CollapsibleTriggerProps) {
  const ctx = useContext(CollapsibleContext);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={ctx?.onToggle}
      style={[styles.trigger, style]}>
      {children}
    </TouchableOpacity>
  );
}

export interface CollapsibleContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function CollapsibleContent({ style, children }: CollapsibleContentProps) {
  const ctx = useContext(CollapsibleContext);
  if (!ctx?.open) return null;

  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  collapsible: {
    width: '100%',
  },
  trigger: {
    paddingVertical: 8,
  },
  panel: {
    paddingVertical: 8,
  },
});
