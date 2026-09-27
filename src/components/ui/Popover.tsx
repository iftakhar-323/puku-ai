import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
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

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = createContext<PopoverContextType>({
  open: false,
  setOpen: () => {},
});

export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpen = (val: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <PopoverContext.Provider value={{ open: isOpen, setOpen: handleOpen }}>
      {children}
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  style,
  asChild,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  asChild?: boolean;
}) {
  const { setOpen } = useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: () => {
        (children.props as any).onPress?.();
        setOpen(true);
      },
    });
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setOpen(true)}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export function PopoverClose({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(PopoverContext);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setOpen(false)}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export function PopoverTitle({
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
    <Text style={[styles.title, { color: theme.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export function PopoverDescription({
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
    <Text style={[styles.description, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

export function PopoverContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  side?: string;
  align?: string;
}) {
  const { open, setOpen } = useContext(PopoverContext);
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
                styles.content,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
                style,
              ]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '84%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
});
