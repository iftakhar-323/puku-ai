import React, { createContext, useContext, useState } from 'react';
import {
  Animated,
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

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType>({
  open: false,
  setOpen: () => {},
});

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DialogRoot({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  style,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  asChild?: boolean;
}) {
  const { setOpen } = useContext(DialogContext);

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
      activeOpacity={0.75}
      onPress={() => setOpen(true)}
      style={style}
      {...props}>
      {children}
    </TouchableOpacity>
  );
}

export function DialogTitle({
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

export function DialogDescription({
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

export function DialogClose({
  children,
  style,
  onPress,
  ...props
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { setOpen } = useContext(DialogContext);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      style={style}
      {...props}>
      {children}
    </TouchableOpacity>
  );
}

export function DialogContent({
  children,
  placement = 'center',
  style,
}: {
  children: React.ReactNode;
  placement?: 'center' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen } = useContext(DialogContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (!open) return null;

  const getPlacementContainerStyle = (): ViewStyle => {
    switch (placement) {
      case 'left':
        return { justifyContent: 'flex-start', alignItems: 'flex-start' };
      case 'right':
        return { justifyContent: 'flex-start', alignItems: 'flex-end' };
      case 'center':
      default:
        return { justifyContent: 'center', alignItems: 'center' };
    }
  };

  const getPlacementBoxStyle = (): ViewStyle => {
    switch (placement) {
      case 'left':
      case 'right':
        return {
          width: '80%',
          height: '100%',
          borderRadius: 0,
          paddingTop: 48,
        };
      case 'center':
      default:
        return {
          width: '88%',
          maxWidth: 420,
          borderRadius: 14,
        };
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType={placement === 'center' ? 'fade' : 'none'}
      onRequestClose={() => setOpen(false)}>
      <View style={[styles.overlay, getPlacementContainerStyle()]}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.dialogBox,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
            getPlacementBoxStyle(),
            style,
          ]}>
          {/* Close button X */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setOpen(false)}
            style={styles.closeBtn}
            accessibilityLabel="Close dialog">
            <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>

          {children}
        </View>
      </View>
    </Modal>
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Portal: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
} as const;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogBox: {
    borderWidth: 1,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    position: 'relative',
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
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
});
