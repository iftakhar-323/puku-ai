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
  MoonIcon,
  RefreshIcon,
  RemoteIcon,
  SidebarToggleIcon,
  SunIcon,
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 10),
        },
      ]}>
      {/* Sleek, Minimal Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
            onPress={() => setDrawerOpen(true)}
            style={styles.leadingBtn}>
            <SidebarToggleIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            CLI Sessions
          </Text>
        </View>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRefresh}
            style={styles.actionBtn}>
            {isRefreshing || isLoadingRelaySessions ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <RefreshIcon size={18} color={theme.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
            onPress={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
            style={styles.actionBtn}>
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
        {/* Account Sync Status Banner */}
        <View
          style={[
            styles.accountPill,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.accountPillLeft}>
            <View
              style={[
                styles.syncDot,
                { backgroundColor: profile?.email ? '#52C41A' : '#FAAD14' },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[styles.accountStatusText, { color: theme.textSecondary, fontFamily: monoFont }]}>
              {profile?.email ? `Account: ${profile.email}` : 'Sign in to sync your laptop'}
            </Text>
          </View>
          {!profile?.email && (
            <TouchableOpacity onPress={() => navigate('login')} style={styles.signInBtn}>
              <Text style={[styles.signInBtnText, { color: theme.primary, fontFamily: monoFont }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Live Laptop Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Detected Laptops
            </Text>
            {activeRelaySessions.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={[styles.countBadgeText, { color: '#52C41A', fontFamily: monoFont }]}>
                  {activeRelaySessions.length} LIVE
                </Text>
              </View>
            )}
          </View>

          {activeRelaySessions.length > 0 ? (
            <View style={styles.sessionsList}>
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
                        {session.title || 'puku-cli'}
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
                          { color: session.live ? '#52C41A' : '#FAAD14', fontFamily: monoFont },
                        ]}>
                        {session.live ? 'LIVE' : 'RESUMABLE'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[styles.sessionIdText, { color: theme.textSecondary, fontFamily: monoFont }]}>
                    ID: {session.sessionId}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      connectRemoteSession(session.sessionId, session.mobileToken);
                      navigate('remoteSession');
                    }}
                    style={[styles.connectBtn, { backgroundColor: theme.primary }]}>
                    <Text style={styles.connectBtnText}>Connect & Open Terminal</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            /* Empty State */
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.emptyIconWrap}>
                <RemoteIcon size={24} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                No Active Sessions
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: monoFont }]}>
                Open terminal on your laptop and run:
              </Text>
              <View style={[styles.codeSnippet, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.codeText, { color: '#52C41A', fontFamily: monoFont }]}>
                  puku-cli
                </Text>
              </View>
              <Text style={[styles.emptyHint, { color: theme.textMuted, fontFamily: monoFont }]}>
                Your session will be automatically detected here.
              </Text>
            </View>
          )}
        </View>

        {/* Section: Direct Connect */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Direct Connect
          </Text>
          <View
            style={[
              styles.manualCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}>
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
                  backgroundColor: manualSessionInput.trim() ? theme.primary : theme.buttonBackground,
                },
              ]}>
              <Text
                style={[
                  styles.manualBtnText,
                  { color: manualSessionInput.trim() ? '#FFFFFF' : theme.textMuted },
                ]}>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: 'rgba(82, 196, 26, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 12,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sessionIdText: {
    fontSize: 11,
    opacity: 0.7,
  },
  connectBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(43, 127, 255, 0.12)',
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
