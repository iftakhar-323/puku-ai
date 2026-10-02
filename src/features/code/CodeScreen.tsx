import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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
  InfoIcon,
  LogoutIcon,
  MoonIcon,
  PukuBotGradientIcon,
  PukuLogoIcon,
  PukuRemoteGradientIcon,
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

interface DetailRow {
  label: string;
  value: string;
}

function getGreeting(userName?: string): { lead: string; name: string } {
  const h = new Date().getHours();
  let lead = 'Good morning,';
  if (h >= 12 && h < 17) {
    lead = 'Good afternoon,';
  } else if (h >= 17 && h < 22) {
    lead = 'Good evening,';
  } else if (h >= 22 || h < 5) {
    lead = 'Back at it,';
  }

  let name = 'there';
  if (userName?.trim()) {
    name = userName.trim().split(/\s+/)[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return { lead, name };
}

export function CodeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, profile, updateSettings, setDrawerOpen, navigate } = useApp();
  const greeting = getGreeting(profile?.name);
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
  const [details, setDetails] = useState<{
    title: string;
    rows: DetailRow[];
  } | null>(null);

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  // Puku brand accent (the logo's lavender/indigo), used for every "online /
  // connected / live" indicator on this screen instead of a generic green.
  const accent = theme.primaryLight;
  const accentSoftBg = isDark
    ? 'rgba(176, 179, 252, 0.16)'
    : 'rgba(72, 77, 208, 0.12)';
  // Official Puku "on accent" ink — readable text color for a solid-accent background.
  const accentInk = isDark ? '#242449' : '#fafaff';

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

  const isAttachedOrActive =
    session.sessionId &&
    ['connecting', 'open', 'attached', 'reconnecting'].includes(session.phase);

  // Partition sessions into Open/Active vs Ended/Closed. The currently
  // attached session already gets its own "Current Attached Session" card
  // above, so it's excluded here to avoid showing it twice.
  const openSessions = activeRelaySessions.filter(
    (s: ActiveRelaySession) =>
      (s.workerConnected || s.live) &&
      !s.expired &&
      !(isAttachedOrActive && s.sessionId === session.sessionId),
  );

  const endedSessions = activeRelaySessions.filter(
    (s: ActiveRelaySession) => !((s.workerConnected || s.live) && !s.expired),
  );

  const openSessionDetails = (s: ActiveRelaySession, ended: boolean) => {
    setDetails({
      title: s.title || 'puku-cli',
      rows: [
        { label: 'Session ID', value: s.sessionId },
        { label: 'Created', value: formatActivityDate(s.createdAt) },
        {
          label: ended ? 'Closed' : 'Last activity',
          value: formatActivityDate(s.titleUpdatedAt || s.createdAt),
        },
        {
          label: 'Clients connected',
          value: String(s.clientCount ?? (s.clientConnected ? 1 : 0)),
        },
        ...(s.ownerEmail ? [{ label: 'Owner', value: s.ownerEmail }] : []),
      ],
    });
  };

  const openCurrentSessionDetails = () => {
    setDetails({
      title: session.title || 'Laptop CLI Session',
      rows: [
        { label: 'Session ID', value: session.sessionId },
        ...(session.cwd ? [{ label: 'Working directory', value: session.cwd }] : []),
        { label: 'Status', value: session.phase },
      ],
    });
  };

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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PukuRemoteGradientIcon size={20} />
            <Text
              style={[
                styles.headerTitle,
                { color: theme.textPrimary, fontFamily: monoFont },
              ]}
            >
              puku remote
            </Text>
          </View>
        </View>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Puku AI"
            activeOpacity={0.7}
            onPress={() => navigate('chat')}
            style={styles.actionBtn}
          >
            <PukuLogoIcon size={19} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Puku Bot"
            activeOpacity={0.7}
            onPress={() => navigate('pukuBot')}
            style={styles.actionBtn}
          >
            <PukuBotGradientIcon size={20} />
          </TouchableOpacity>

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
        {/* Hero Header with Dynamic Greeting & Retro Computer Illustration (matching Puku AI 1:1) */}
        <View style={styles.heroRow}>
          <View style={styles.headlineWrapper}>
            <Text style={[styles.headlineLead, { color: theme.textSecondary }]}>
              {greeting.lead}
            </Text>
            <Text style={[styles.headlineName, { color: theme.textPrimary }]}>
              {greeting.name}
            </Text>
          </View>
          <View
            style={[
              styles.computerWrapper,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.outline || theme.border,
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/retro_puku_computer.png')}
              style={styles.computerImage}
              resizeMode="contain"
            />
          </View>
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
              <View style={[styles.badge, { backgroundColor: accentSoftBg }]}>
                <Text
                  style={[
                    styles.badgeText,
                    { color: accent, fontFamily: monoFont },
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
                  borderColor: accent,
                },
              ]}
            >
              <View style={styles.sessionHeaderRow}>
                <View style={styles.sessionTitleGroup}>
                  <View style={[styles.liveDot, { backgroundColor: accent }]} />
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
                <View style={[styles.liveBadge, { backgroundColor: accentSoftBg }]}>
                  <Text
                    style={[
                      styles.liveBadgeText,
                      { color: accent, fontFamily: monoFont },
                    ]}
                  >
                    LIVE NOW
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Session details"
                activeOpacity={0.6}
                onPress={openCurrentSessionDetails}
                style={styles.detailsLink}
              >
                <InfoIcon size={13} color={theme.textMuted} />
                <Text
                  style={[
                    styles.detailsLinkText,
                    { color: theme.textMuted, fontFamily: monoFont },
                  ]}
                >
                  Details
                </Text>
              </TouchableOpacity>

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
                      ? accentSoftBg
                      : theme.pillBackground || 'rgba(255, 255, 255, 0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  {
                    color: openSessions.length > 0 ? accent : theme.textMuted,
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
                          ? accent
                          : theme.border,
                    },
                  ]}
                >
                  <View style={styles.sessionHeaderRow}>
                    <View style={styles.sessionTitleGroup}>
                      <View style={[styles.liveDot, { backgroundColor: accent }]} />
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
                    <View style={[styles.liveBadge, { backgroundColor: accentSoftBg }]}>
                      <Text
                        style={[
                          styles.liveBadgeText,
                          { color: accent, fontFamily: monoFont },
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
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Session details"
                      activeOpacity={0.6}
                      onPress={() => openSessionDetails(s, false)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <InfoIcon size={14} color={theme.textMuted} />
                    </TouchableOpacity>
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
                            ? accent
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
                              ? accentInk
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
              <RemoteIcon size={28} color={theme.textMuted} />
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
                    { color: accent, fontFamily: monoFont },
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
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Session details"
                      activeOpacity={0.6}
                      onPress={() => openSessionDetails(s, true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <InfoIcon size={14} color={theme.textMuted} />
                    </TouchableOpacity>
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

      <Modal
        visible={!!details}
        transparent
        animationType="fade"
        onRequestClose={() => setDetails(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDetails(null)}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: Math.max(insets.bottom + 12, 24),
              },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.outline }]} />
            <View style={styles.modalHeader}>
              <Text
                numberOfLines={1}
                style={[
                  styles.modalTitle,
                  { color: theme.textPrimary, fontFamily: monoFont },
                ]}
              >
                {details?.title}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setDetails(null)}
              >
                <CloseIcon size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {details?.rows.map(row => (
              <View
                key={row.label}
                style={[styles.modalRow, { borderBottomColor: theme.outline }]}
              >
                <Text
                  style={[
                    styles.modalRowLabel,
                    { color: theme.textMuted, fontFamily: monoFont },
                  ]}
                >
                  {row.label}
                </Text>
                <Text
                  selectable
                  style={[
                    styles.modalRowValue,
                    { color: theme.textPrimary, fontFamily: monoFont },
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 4,
  },
  headlineWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  headlineLead: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  headlineName: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 35,
    letterSpacing: -0.4,
  },
  computerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  computerImage: {
    width: 120,
    height: 112,
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
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  detailsLinkText: {
    fontSize: 11.5,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  modalRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  modalRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  modalRowValue: {
    fontSize: 13,
  },
});
