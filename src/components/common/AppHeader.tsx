import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { BackIcon, MenuIcon } from './Icons';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
}

export function AppHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  children,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme, setDrawerOpen, goBack } = useApp();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 14),
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}>
      <View style={styles.contentRow}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity
              onPress={onBack || goBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.actionBtn}>
              <BackIcon size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.actionBtn}>
              <MenuIcon size={22} color={theme.menuIcon} />
            </TouchableOpacity>
          )}

          {title && (
            <Text
              numberOfLines={1}
              style={[styles.title, { color: theme.textPrimary }]}>
              {title}
            </Text>
          )}
        </View>

        {children}

        <View style={styles.rightContainer}>{rightAction}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  contentRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  actionBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
