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

interface TooltipContextType {
  open: boolean;
  setOpen: (val: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType>({
  open: false,
  setOpen: () => {},
});

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipRoot({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <View style={styles.root}>{children}</View>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  style,
  asChild,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  asChild?: boolean;
}) {
  const { open, setOpen } = useContext(TooltipContext);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setOpen(!open)}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export function TooltipContent({
  children,
  side = 'top',
  style,
  textStyle,
}: {
  children: React.ReactNode;
  side?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { open } = useContext(TooltipContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (!open) return null;

  return (
    <View
      style={[
        styles.content,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          bottom: side === 'top' ? '100%' : undefined,
          top: side === 'bottom' ? '100%' : undefined,
          marginBottom: side === 'top' ? 6 : 0,
          marginTop: side === 'bottom' ? 6 : 0,
        },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: theme.textPrimary }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
} as const;

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    zIndex: 999,
    elevation: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
