import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
  const { theme, isDark, updateSettings, setDrawerOpen, navigate } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [showPastSessions, setShowPastSessions] = useState(false);

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
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
          Continue a terminal session from this browser.
        </Text>

        {/* Start on your computer Section */}
        <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
          Start on your computer
        </Text>

        <View style={styles.stepsList}>
          <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
            1. Open your project in a terminal and run{'\n'}   puku-cli.
          </Text>
          <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
            2. Type /remote-web inside the CLI.
          </Text>
          <Text style={[styles.stepItem, { color: theme.textPrimary, fontFamily: monoFont }]}>
            3. Keep the terminal open, then select its{'\n'}   session below.
          </Text>
        </View>

        <Text style={[styles.accountNotice, { color: theme.textPrimary, fontFamily: monoFont }]}>
          Use the same Puku account on both devices.
        </Text>

        {/* Empty CLI sessions note */}
        <Text style={[styles.emptyNotice, { color: theme.textPrimary, fontFamily: monoFont }]}>
          No CLI sessions yet. They will appear here when you run /remote-web.
        </Text>

        {/* Refresh Sessions Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRefresh}
          style={[styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          {isRefreshing ? (
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
});
