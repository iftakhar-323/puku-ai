import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      show: () => '',
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback(
    (item: Omit<ToastItem, 'id'>): string => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newToast: ToastItem = { ...item, id };
      setToasts(prev => [...prev, newToast]);

      const duration = item.duration || 3500;
      setTimeout(() => {
        dismiss(id);
      }, duration);

      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const { toasts, dismiss } = useToast();
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    const safeInsets = useSafeAreaInsets();
    if (safeInsets) insets = safeInsets;
  } catch {}
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        { top: Math.max(insets.top, 16) + 8 },
      ]}>
      {toasts.map(toast => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onClose={() => dismiss(toast.id)}
          theme={theme}
        />
      ))}
    </View>
  );
}

function ToastCard({
  toast,
  onClose,
  theme,
}: {
  toast: ToastItem;
  onClose: () => void;
  theme: any;
}) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const getBorderColor = () => {
    switch (toast.variant) {
      case 'success':
        return '#52C41A';
      case 'warning':
        return '#FAAD14';
      case 'destructive':
        return '#FF4D4F';
      default:
        return theme.border;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.secondaryBackground,
          borderColor: getBorderColor(),
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {toast.title}
        </Text>
        {!!toast.description && (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {toast.description}
          </Text>
        )}
        {toast.action && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              toast.action?.onPress();
              onClose();
            }}
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.actionBtnText}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={onClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.closeBtn}>
        <Text style={[styles.closeText, { color: theme.textSecondary }]}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '600',
  },
});
