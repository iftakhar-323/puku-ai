import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CloseIcon,
  ConnectedLinkIcon,
  LogoutIcon,
  MoonIcon,
  RefreshIcon,
  RemoteIcon,
  SidebarToggleIcon,
  SunIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import {
  useRelaySessionPolling,
  useRemoteSession,
} from '../../store/RemoteSessionContext';
import { formatActivityDate } from '../../utils/date';
import type { ActiveRelaySession } from '../../types';

export function CodeScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    isDark,
    updateSettings,
    setDrawerOpen,
    navigate,
    profile,
  } = useApp();
  const {
    session,
    isActive: isCurrentSessionActive,
    activeRelaySessions,
    isLoadingRelaySessions,
    fetchActiveRelaySessions,
    connect: connectRemoteSession,
    disconnect,
  } = useRemoteSession();
  useRelaySessionPolling(true);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualSessionInput, setManualSessionInput] = useState('');

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActiveRelaySessions();
    setIsRefreshing(false);
  };

  const handleDirectConnect = () => {
    const raw = manualSessionInput.trim();
    if (!raw) return;
    const match = raw.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
    );
    const sessionId = match ? match[1] : raw;
    connectRemoteSession(sessionId);
    navigate('remoteSession');
  };

  // Partition sessions into Open/Active vs Ended/Closed
  const openSessions = activeRelaySessions.filter(
    (s: ActiveRelaySession) => (s.workerConnected || s.live) && !s.expired,
  );

  const endedSessions = activeRelaySessions.filter(
    (s: ActiveRelaySession) => !((s.workerConnected || s.live) && !s.expired),
  );

  const isAttachedOrActive =
    session.sessionId &&
    ['connecting', 'open', 'attached', 'reconnecting'].includes(session.phase);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 10),
        },
      ]}
    >
      {/* Sleek, Minimal Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.outline || 'rgba(255, 255, 255, 0.08)' },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
            onPress={() => setDrawerOpen(true)}
            style={styles.leadingBtn}
          >
            <SidebarToggleIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              { color: theme.textPrimary, fontFamily: monoFont },
            ]}
          >
            Terminal Sessions
          </Text>
        </View>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh"
            activeOpacity={0.7}
            onPress={handleRefresh}
            style={styles.actionBtn}
          >
            {isRefreshing || isLoadingRelaySessions ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <RefreshIcon size={18} color={theme.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
            onPress={() =>
              updateSettings({ themeMode: isDark ? 'light' : 'dark' })
            }
            style={styles.actionBtn}
          >
            {isDark ? (
              <SunIcon size={19} color={theme.textPrimary} />
            ) : (
              <MoonIcon size={19} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Sync Status Banner */}
        <View
          style={[
            styles.accountPill,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.accountPillLeft}>
            <View
              style={[
                styles.syncDot,
                { backgroundColor: profile?.email ? '#52C41A' : '#FAAD14' },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.accountStatusText,
                { color: theme.textSecondary, fontFamily: monoFont },
              ]}
            >
              {profile?.email
                ? `Account: ${profile.email}`
                : 'Sign in to sync your laptop terminals'}
            </Text>
          </View>
          {!profile?.email && (
            <TouchableOpacity
              onPress={() => navigate('login')}
              style={styles.signInBtn}
            >
              <Text
                style={[
                  styles.signInBtnText,
                  { color: theme.primary, fontFamily: monoFont },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CURRENTLY ATTACHED SESSION (If active) */}
        {isAttachedOrActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textPrimary, fontFamily: monoFont },
                ]}
              >
                Current Attached Session
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: 'rgba(82, 196, 26, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: '#52C41A', fontFamily: monoFont },
                  ]}
                >
                  {session.phase === 'attached' ? 'CONNECTED' : session.phase.toUpperCase()}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.currentCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: '#52C41A',
                },
              ]}
            >
              <View style={styles.sessionHeaderRow}>
                <View style={styles.sessionTitleGroup}>
                  <View
                    style={[styles.liveDot, { backgroundColor: '#52C41A' }]}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sessionTitle,
                      { color: theme.textPrimary, fontFamily: monoFont },
                    ]}
                  >
                    {session.title || 'Laptop CLI Session'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.liveBadge,
                    { backgroundColor: 'rgba(82, 196, 26, 0.15)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.liveBadgeText,
                      { color: '#52C41A', fontFamily: monoFont },
                    ]}
                  >
                    LIVE NOW
                  </Text>
                </View>
              </View>

              {session.cwd ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sessionDirText,
                    { color: theme.textSecondary, fontFamily: monoFont },
                  ]}
                >
                  {session.cwd}
                </Text>
              ) : null}

              <Text
                numberOfLines={1}
                style={[
                  styles.sessionIdText,
                  { color: theme.textMuted, fontFamily: monoFont },
                ]}
              >
                ID: {session.sessionId}
              </Text>

              <View style={styles.currentActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigate('remoteSession')}
                  style={[styles.openActiveBtn, { backgroundColor: theme.textPrimary }]}
                >
                  <ConnectedLinkIcon size={16} color={theme.background} />
                  <Text
                    style={[styles.openActiveBtnText, { color: theme.background }]}
                  >
                    Open Active Chat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={disconnect}
                  style={[styles.disconnectBtn, { borderColor: theme.error }]}
                >
                  <LogoutIcon size={15} color={theme.error} />
                  <Text style={[styles.disconnectBtnText, { color: theme.error }]}>
                    Disconnect
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* SECTION 1: ACTIVE / OPEN TERMINALS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.textPrimary, fontFamily: monoFont },
              ]}
            >
              Active Terminals (Open Now)
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor:
                    openSessions.length > 0
                      ? 'rgba(82, 196, 26, 0.12)'
                      : theme.pillBackground || 'rgba(255, 255, 255, 0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  {
                    color: openSessions.length > 0 ? '#52C41A' : theme.textMuted,
                    fontFamily: monoFont,
                  },
                ]}
              >
                {openSessions.length} ONLINE
              </Text>
            </View>
          </View>

          {openSessions.length > 0 ? (
            <View style={styles.sessionsList}>
              {openSessions.map((s: ActiveRelaySession) => (
                <View
                  key={s.sessionId}
                  style={[
                    styles.sessionCard,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor:
                        session.sessionId === s.sessionId
                          ? '#52C41A'
                          : theme.border,
                    },
                  ]}
                >
                  <View style={styles.sessionHeaderRow}>
                    <View style={styles.sessionTitleGroup}>
                      <View
                        style={[
                          styles.liveDot,
                          { backgroundColor: '#52C41A' },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.sessionTitle,
                          { color: theme.textPrimary, fontFamily: monoFont },
                        ]}
                      >
                        {s.title || 'puku-cli'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.liveBadge,
                        { backgroundColor: 'rgba(82, 196, 26, 0.15)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.liveBadgeText,
                          { color: '#52C41A', fontFamily: monoFont },
                        ]}
                      >
                        ONLINE
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sessionMetaText,
                        { color: theme.textSecondary, fontFamily: monoFont },
                      ]}
                    >
                      Online · {formatActivityDate(s.titleUpdatedAt || s.createdAt)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sessionIdText,
                        { color: theme.textMuted, fontFamily: monoFont },
                      ]}
                    >
                      {s.sessionId.slice(0, 16)}…
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      connectRemoteSession(s.sessionId, s.mobileToken);
                      navigate('remoteSession');
                    }}
                    style={[
                      styles.connectBtn,
                      {
                        backgroundColor:
                          session.sessionId === s.sessionId
                            ? '#52C41A'
                            : theme.textPrimary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.connectBtnText,
                        {
                          color:
                            session.sessionId === s.sessionId
                              ? '#FFFFFF'
                              : theme.background,
                        },
                      ]}
                    >
                      {session.sessionId === s.sessionId
                        ? 'Open Active Terminal'
                        : 'Connect & Open Terminal'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <RemoteIcon size={24} color={theme.textPrimary} />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.textPrimary, fontFamily: monoFont },
                ]}
              >
                No Active Terminals Open
              </Text>
              <Text
                style={[
                  styles.emptyDesc,
                  { color: theme.textSecondary, fontFamily: monoFont },
                ]}
              >
                Run Puku CLI on your laptop to mirror your terminal:
              </Text>
              <View
                style={[
                  styles.codeSnippet,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.codeText,
                    { color: '#52C41A', fontFamily: monoFont },
                  ]}
                >
                  /remote-control
                </Text>
              </View>
              <Text
                style={[
                  styles.emptyHint,
                  { color: theme.textMuted, fontFamily: monoFont },
                ]}
              >
                Sessions on your account will appear here automatically.
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 2: PREVIOUS / ENDED TERMINALS */}
        {endedSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textPrimary, fontFamily: monoFont },
                ]}
              >
                Previous Terminals (Ended)
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      theme.pillBackground || 'rgba(255, 255, 255, 0.06)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: theme.textMuted, fontFamily: monoFont },
                  ]}
                >
                  {endedSessions.length} ENDED
                </Text>
              </View>
            </View>

            <View style={styles.sessionsList}>
              {endedSessions.map((s: ActiveRelaySession) => (
                <View
                  key={s.sessionId}
                  style={[
                    styles.sessionCard,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                      opacity: 0.88,
                    },
                  ]}
                >
                  <View style={styles.sessionHeaderRow}>
                    <View style={styles.sessionTitleGroup}>
                      <View
                        style={[
                          styles.liveDot,
                          { backgroundColor: theme.textMuted },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.sessionTitle,
                          { color: theme.textPrimary, fontFamily: monoFont },
                        ]}
                      >
                        {s.title || 'puku-cli'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.liveBadge,
                        {
                          backgroundColor:
                            theme.pillBackground ||
                            'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.liveBadgeText,
                          { color: theme.textMuted, fontFamily: monoFont },
                        ]}
                      >
                        ENDED
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sessionMetaText,
                        { color: theme.textSecondary, fontFamily: monoFont },
                      ]}
                    >
                      Closed · {formatActivityDate(s.titleUpdatedAt || s.createdAt)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sessionIdText,
                        { color: theme.textMuted, fontFamily: monoFont },
                      ]}
                    >
                      {s.sessionId.slice(0, 16)}…
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      connectRemoteSession(s.sessionId, s.mobileToken);
                      navigate('remoteSession');
                    }}
                    style={[
                      styles.connectBtn,
                      {
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor: theme.outline || theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.connectBtnText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Resume / View History
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SECTION 3: DIRECT CONNECT BY SESSION ID */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.textPrimary, fontFamily: monoFont },
            ]}
          >
            Direct Connect
          </Text>
          <View
            style={[
              styles.manualCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.manualInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  fontFamily: monoFont,
                },
              ]}
              placeholder="Paste session ID or link..."
              placeholderTextColor={theme.textMuted}
              value={manualSessionInput}
              onChangeText={setManualSessionInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!manualSessionInput.trim()}
              onPress={handleDirectConnect}
              style={[
                styles.manualBtn,
                {
                  backgroundColor: manualSessionInput.trim()
                    ? theme.textPrimary
                    : theme.buttonBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.manualBtnText,
                  {
                    color: manualSessionInput.trim()
                      ? theme.background
                      : theme.textMuted,
                  },
                ]}
              >
                Connect
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leadingBtn: {
    width: 28,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  accountStatusText: {
    fontSize: 12,
    flex: 1,
  },
  signInBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  currentCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  currentActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  openActiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  openActiveBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disconnectBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionMetaText: {
    fontSize: 11.5,
  },
  sessionDirText: {
    fontSize: 11.5,
  },
  sessionIdText: {
    fontSize: 11,
  },
  connectBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  connectBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  codeSnippet: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 4,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 11,
    textAlign: 'center',
  },
  manualCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  manualBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
