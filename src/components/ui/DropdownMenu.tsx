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

interface DropdownContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextType>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({
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
    <DropdownContext.Provider value={{ open: isOpen, setOpen: handleOpen }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}) {
  return <View style={styles.group}>{children}</View>;
}

export const DropdownMenuSub = DropdownMenuGroup;

export function DropdownMenuTrigger({
  children,
  style,
  asChild,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  asChild?: boolean;
}) {
  const { setOpen } = useContext(DropdownContext);

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

export function DropdownMenuContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  side?: string;
  align?: string;
}) {
  const { open, setOpen } = useContext(DropdownContext);
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
                styles.menu,
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

export function DropdownMenuLabel({
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

export function DropdownMenuItem({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(DropdownContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      style={[styles.item, { opacity: disabled ? 0.4 : 1 }, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.itemText, { color: theme.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function DropdownMenuSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.border },
        style,
      ]}
    />
  );
}

export function DropdownMenuSubTrigger({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.item, styles.subTrigger, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.itemText, { color: theme.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>›</Text>
    </TouchableOpacity>
  );
}

export function DropdownMenuCheckboxItem({
  checked,
  children,
  onPress,
  style,
}: {
  checked?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(DropdownContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      style={[styles.item, style]}>
      <Text style={[styles.check, { color: checked ? theme.accent : 'transparent' }]}>
        ✓
      </Text>
      {typeof children === 'string' ? (
        <Text style={[styles.itemText, { color: theme.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export function DropdownMenuRadioItem({
  checked,
  children,
  onPress,
  style,
}: {
  checked?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { setOpen } = useContext(DropdownContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      style={[styles.item, style]}>
      <Text style={[styles.check, { color: checked ? theme.accent : 'transparent' }]}>
        ●
      </Text>
      {typeof children === 'string' ? (
        <Text style={[styles.itemText, { color: theme.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    minWidth: 200,
    maxWidth: '85%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
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
    paddingVertical: 6,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  subTrigger: {
    justifyContent: 'space-between',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  check: {
    fontSize: 14,
    width: 16,
    textAlign: 'center',
  },
});
