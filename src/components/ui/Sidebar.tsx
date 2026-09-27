import React, { forwardRef } from 'react';
import {
  ScrollView,
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

export interface SidebarRootProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SidebarRoot({ children, style }: SidebarRootProps) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.background },
        style,
      ]}>
      {children}
    </View>
  );
}

/* ── Mode row ───────────────────────────────────────────────────────────── */

export function ModeRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.modeRow, style]}>{children}</View>;
}

export interface ModeTabProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ModeTab = forwardRef<any, ModeTabProps>(function ModeTab(
  { active, disabled, label, icon, onPress, style },
  _ref,
) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.modeTab,
        {
          backgroundColor: active ? theme.cardBackground : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {icon && <View style={styles.tabIcon}>{icon}</View>}
      {typeof label === 'string' ? (
        <Text
          style={[
            styles.modeTabText,
            {
              color: active ? theme.textPrimary : theme.textSecondary,
              fontWeight: active ? '600' : '400',
            },
          ]}>
          {label}
        </Text>
      ) : (
        label
      )}
    </TouchableOpacity>
  );
});

/* ── Top nav ────────────────────────────────────────────────────────────── */

export function NavTop({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.navTop, style]}>{children}</View>;
}

export interface NavItemProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  dim?: boolean;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const NavItem = forwardRef<any, NavItemProps>(function NavItem(
  { icon, disabled, dim, active, children, onPress, style },
  _ref,
) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.navItem,
        {
          backgroundColor: active ? theme.cardBackground : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      <View style={styles.navItemIcon}>{icon}</View>
      <View style={styles.navItemLabelWrap}>
        {typeof children === 'string' ? (
          <Text
            numberOfLines={1}
            style={[
              styles.navItemText,
              {
                color: dim ? theme.textSecondary : theme.textPrimary,
                fontWeight: active ? '600' : '500',
              },
            ]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </TouchableOpacity>
  );
});

/* ── Sessions ───────────────────────────────────────────────────────────── */

export function Sessions({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={[styles.sessions, style]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function SessionGroup({
  label,
  children,
  style,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={[styles.sessionGroup, style]}>
      {typeof label === 'string' ? (
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
          {label}
        </Text>
      ) : (
        label
      )}
      {children}
    </View>
  );
}

export type RowIconVariant = 'diff' | 'dots' | 'circle' | 'custom';

export function RowIcon({
  variant = 'diff',
  unread,
  children,
}: {
  variant?: RowIconVariant;
  unread?: boolean;
  children?: React.ReactNode;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  if (variant === 'custom') {
    return <View style={styles.rowIconContainer}>{children}</View>;
  }

  if (variant === 'dots') {
    return (
      <View style={styles.rowIconDots}>
        <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
        <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
        <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
      </View>
    );
  }

  if (variant === 'circle') {
    return (
      <View
        style={[
          styles.rowIconCircle,
          {
            borderColor: unread ? theme.accent : theme.textMuted,
            backgroundColor: unread ? theme.accent : 'transparent',
          },
        ]}
      />
    );
  }

  // diff
  return (
    <View style={styles.rowIconDiff}>
      <Text style={[styles.diffText, { color: theme.textMuted }]}>⇄</Text>
    </View>
  );
}

export function RowMore({
  label,
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityLabel={label || 'Row options'}
      onPress={onPress}
      style={styles.rowMoreBtn}>
      <Text style={[styles.moreDots, { color: theme.textSecondary }]}>⋯</Text>
    </TouchableOpacity>
  );
}

export interface SessionRowProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  iconVariant?: RowIconVariant;
  unread?: boolean;
  active?: boolean;
  onPress?: () => void;
  onMorePress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SessionRow = forwardRef<any, SessionRowProps>(function SessionRow(
  { label, icon, iconVariant, unread, active, onPress, onMorePress, style },
  _ref,
) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  const computedVariant: RowIconVariant =
    iconVariant ?? (icon ? 'custom' : 'diff');

  return (
    <View
      style={[
        styles.sessionRow,
        {
          backgroundColor: active ? theme.cardBackground : 'transparent',
        },
        style,
      ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.sessionRowSelect}>
        <RowIcon variant={computedVariant} unread={unread}>
          {icon}
        </RowIcon>
        {typeof label === 'string' ? (
          <Text
            numberOfLines={1}
            style={[
              styles.sessionRowLabel,
              {
                color: active ? theme.textPrimary : theme.textSecondary,
                fontWeight: active ? '600' : '400',
              },
            ]}>
            {label}
          </Text>
        ) : (
          label
        )}
      </TouchableOpacity>
      <RowMore onPress={onMorePress} />
    </View>
  );
});

/* ── Footer ─────────────────────────────────────────────────────────────── */

export function Footer({
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
        styles.footer,
        {
          borderTopColor: theme.border,
          backgroundColor: theme.background,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function FooterLabel({
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
    <Text
      numberOfLines={1}
      style={[styles.footerLabel, { color: theme.textPrimary }, style]}>
      {children}
    </Text>
  );
}

export function FooterSpacer() {
  return <View style={styles.footerSpacer} />;
}

export interface FooterActionProps {
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const FooterAction = forwardRef<any, FooterActionProps>(function FooterAction(
  { label, onPress, children, style },
  _ref,
) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.footerAction, style]}>
      {children}
    </TouchableOpacity>
  );
});

/* ── Public API ─────────────────────────────────────────────────────────── */

export const Sidebar = Object.assign(SidebarRoot, {
  ModeRow,
  ModeTab,
  NavTop,
  NavItem,
  Sessions,
  SessionGroup,
  SessionRow,
  RowIcon,
  RowMore,
  Footer: Object.assign(Footer, {
    Label: FooterLabel,
    Spacer: FooterSpacer,
    Action: FooterAction,
  }),
});

export const {
  ModeRow: SidebarModeRow,
  ModeTab: SidebarModeTab,
  NavTop: SidebarNavTop,
  NavItem: SidebarNavItem,
  Sessions: SidebarSessions,
  SessionGroup: SidebarSessionGroup,
  SessionRow: SidebarSessionRow,
  RowIcon: SidebarRowIcon,
  RowMore: SidebarRowMore,
  Footer: SidebarFooter,
} = {
  ModeRow,
  ModeTab,
  NavTop,
  NavItem,
  Sessions,
  SessionGroup,
  SessionRow,
  RowIcon,
  RowMore,
  Footer: Object.assign(Footer, {
    Label: FooterLabel,
    Spacer: FooterSpacer,
    Action: FooterAction,
  }),
};

export type SidebarRowIconVariant = RowIconVariant;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tabIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabText: {
    fontSize: 12,
  },
  navTop: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navItemIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemLabelWrap: {
    flex: 1,
  },
  navItemText: {
    fontSize: 13,
  },
  sessions: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sessionGroup: {
    marginBottom: 12,
    gap: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingRight: 4,
  },
  sessionRowSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sessionRowLabel: {
    flex: 1,
    fontSize: 13,
  },
  rowIconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDots: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  rowIconCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  rowIconDiff: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffText: {
    fontSize: 14,
    lineHeight: 16,
  },
  rowMoreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  moreDots: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 140,
  },
  footerSpacer: {
    flex: 1,
  },
  footerAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
});
