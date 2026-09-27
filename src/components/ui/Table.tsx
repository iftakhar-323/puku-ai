import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

export function Table({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}>
      <View
        style={[
          styles.table,
          {
            borderColor: theme.border,
            backgroundColor: theme.cardBackground,
          },
          style,
        ]}>
        {children}
      </View>
    </ScrollView>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

export function TableFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function TableRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function TableHead({
  children,
  style,
  textStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={[styles.cell, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.headText, { color: theme.textSecondary }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export function TableCell({
  children,
  style,
  textStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={[styles.cell, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.cellText, { color: theme.textPrimary }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export function TableCaption({
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
    <Text style={[styles.caption, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 320,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  body: {},
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 100,
    justifyContent: 'center',
  },
  headText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 13,
  },
  caption: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
