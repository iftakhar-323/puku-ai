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
  BotIcon,
  MoonIcon,
  SidebarToggleIcon,
  SunIcon,
  TerminalPromptIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';

export function CodeScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    isDark,
    updateSettings,
    setDrawerOpen,
    navigate,
    profile,
    activeRelaySessions,
    isLoadingRelaySessions,
    fetchActiveRelaySessions,
    connectRemoteSession,
  } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [manualSessionInput, setManualSessionInput] = useState('');

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  React.useEffect(() => {
    fetchActiveRelaySessions().catch(() => {});
    const interval = setInterval(() => {
      fetchActiveRelaySessions().catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchActiveRelaySessions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActiveRelaySessions();
    setIsRefreshing(false);
  };

  const handleDirectConnect = () => {
    const raw = manualSessionInput.trim();
    if (!raw) return;
    const match = raw.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    const sessionId = match ? match[1] : raw;
    connectRemoteSession(sessionId);
    navigate('remoteSession');
  };

  const handleLoadPastSessions = () => {
    setIsLoadingPast(true);
    setTimeout(() => {
      setIsLoadingPast(false);
      setShowPastSessions(true);
    }, 600);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}>
      {/* 1:1 Header matching screenshot */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
          onPress={() => setDrawerOpen(true)}
          style={styles.leadingBtn}>
          <SidebarToggleIcon size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('chat')}
            style={styles.actionBtn}>
            <TerminalPromptIcon size={19} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('pukuBot')}
            style={styles.actionBtn}>
            <BotIcon size={19} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
            onPress={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
            style={styles.trailingBtn}>
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
        showsVerticalScrollIndicator={false}>
        {/* Main Title & Subtitle */}
        <Text style={[styles.mainTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
          CLI sessions
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: monoFont }]}>
          Continue a terminal session from your laptop right here.
        </Text>

        {/* Account indicator badge */}
        <View style={[styles.accountBadgeRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.accountStatusText, { color: theme.textSecondary, fontFamily: monoFont }]}>
            {profile?.email ? `Account: ${profile.email}` : '⚠️ Not signed in on phone'}
          </Text>
          {!profile?.email ? (
            <TouchableOpacity onPress={() => navigate('login')} style={styles.signInLink}>
              <Text style={[styles.signInLinkText, { color: theme.primary, fontFamily: monoFont }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.syncDot} />
          )}
        </View>

        {/* Direct Connect Box */}
        <View style={[styles.manualConnectCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.manualLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Direct Connect
          </Text>
          <Text style={[styles.manualSub, { color: theme.textMuted, fontFamily: monoFont }]}>
            Or paste session link / ID from terminal:
          </Text>
          <View style={styles.manualInputRow}>
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
              placeholder="e.g. af689a1b-... or puku.sh/code/..."
              placeholderTextColor={theme.textMuted}
              value={manualSessionInput}
              onChangeText={setManualSessionInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDirectConnect}
              style={[styles.manualBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.manualBtnText}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Active Sessions Section */}
        {activeRelaySessions.length > 0 ? (
          <View style={styles.activeSessionsContainer}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Live Laptop Sessions ({activeRelaySessions.length})
            </Text>
            {activeRelaySessions.map(session => (
              <View
                key={session.sessionId}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: session.live ? '#52C41A' : theme.border,
                  },
                ]}>
                <View style={styles.sessionHeaderRow}>
                  <View style={styles.sessionTitleGroup}>
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: session.live ? '#52C41A' : '#FAAD14' },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.sessionTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                      {session.title || 'Remote Terminal Session'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: session.live
                          ? 'rgba(82, 196, 26, 0.15)'
                          : 'rgba(250, 173, 20, 0.15)',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.liveBadgeText,
                        { color: session.live ? '#52C41A' : '#FAAD14' },
                      ]}>
                      {session.live ? 'LIVE ON LAPTOP' : 'RESUMABLE'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sessionIdText, { color: theme.textSecondary, fontFamily: monoFont }]}>
                  ID: {session.sessionId}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    connectRemoteSession(session.sessionId, session.mobileToken);
                    navigate('remoteSession');
                  }}
                  style={[styles.connectNowBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.connectNowBtnText}>Connect & Control</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Start on your computer Section */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Start on your computer
            </Text>

            <View style={styles.stepsList}>
              <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
                1. Open your project in terminal and run{'\n'}   puku-cli.
              </Text>
              <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
                2. Type /remote-control inside the CLI.
              </Text>
              <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
                3. Your live session will appear here automatically.
              </Text>
            </View>

            <Text style={[styles.accountNotice, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Use the same Puku account on both devices.
            </Text>

            {/* Empty CLI sessions note */}
            <Text style={[styles.emptyNotice, { color: theme.textSecondary, fontFamily: monoFont }]}>
              No active CLI sessions right now. Run /remote-control on your laptop to start.
            </Text>
          </>
        )}

        {/* Refresh Sessions Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRefresh}
          style={[styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          {isRefreshing || isLoadingRelaySessions ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <Text style={[styles.btnLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Refresh sessions
            </Text>
          )}
        </TouchableOpacity>

        {/* Past Sessions Section */}
        <View style={styles.pastSessionsSection}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Past sessions
          </Text>

          {showPastSessions ? (
            <View style={[styles.pastSessionsBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.noPastText, { color: theme.textMuted, fontFamily: monoFont }]}>
                No past remote CLI sessions found for this account.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLoadPastSessions}
              style={[styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              {isLoadingPast ? (
                <ActivityIndicator size="small" color={theme.textPrimary} />
              ) : (
                <Text style={[styles.btnLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  Load past sessions
                </Text>
              )}
            </TouchableOpacity>
          )}
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
  },
  leadingBtn: {
    width: 22,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  trailingBtn: {
    width: 22,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  stepsList: {
    gap: 12,
    marginBottom: 20,
  },
  stepItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  accountNotice: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyNotice: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  outlineBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 13,
  },
  pastSessionsSection: {
    marginTop: 36,
  },
  pastSessionsBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  noPastText: {
    fontSize: 13,
    lineHeight: 18,
  },
  activeSessionsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  sessionCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionIdText: {
    fontSize: 12,
    opacity: 0.8,
  },
  connectNowBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  connectNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  accountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  accountStatusText: {
    fontSize: 12,
  },
  signInLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  signInLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52C41A',
  },
  manualConnectCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  manualLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  manualSub: {
    fontSize: 11,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  manualBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
