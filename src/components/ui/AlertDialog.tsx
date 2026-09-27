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

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);

export interface AlertDialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialogRoot({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: AlertDialogRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <AlertDialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AlertDialogTrigger({ style, children }: AlertDialogTriggerProps) {
  const ctx = useContext(AlertDialogContext);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => ctx?.setOpen(true)}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export interface AlertDialogCloseProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  children: React.ReactNode;
}

export function AlertDialogClose({ style, onPress, children }: AlertDialogCloseProps) {
  const ctx = useContext(AlertDialogContext);

  const handlePress = () => {
    onPress?.();
    ctx?.setOpen(false);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export interface AlertDialogContentProps {
  placement?: 'center' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AlertDialogContent({
  placement = 'center',
  style,
  children,
}: AlertDialogContentProps) {
  const ctx = useContext(AlertDialogContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (!ctx?.open) return null;

  const getPlacementStyle = () => {
    switch (placement) {
      case 'left':
        return styles.placementLeft;
      case 'right':
        return styles.placementRight;
      case 'center':
      default:
        return styles.placementCenter;
    }
  };

  return (
    <Modal
      transparent
      visible={ctx.open}
      animationType="fade"
      onRequestClose={() => ctx.setOpen(false)}>
      <TouchableWithoutFeedback onPress={() => ctx.setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialog,
                {
                  backgroundColor: theme.secondaryBackground,
                  borderColor: theme.border,
                },
                getPlacementStyle(),
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

export interface AlertDialogTitleProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDialogTitle({ style, children }: AlertDialogTitleProps) {
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

export interface AlertDialogDescriptionProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AlertDialogDescription({ style, children }: AlertDialogDescriptionProps) {
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

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Portal: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Close: AlertDialogClose,
} as const;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  placementCenter: {
    alignSelf: 'center',
  },
  placementLeft: {
    alignSelf: 'flex-start',
  },
  placementRight: {
    alignSelf: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
});
