import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarIcon,
  RefreshIcon,
} from '../../components/common/Icons';
import { ChatHeader } from '../chat/components/ChatHeader';
import { useApp } from '../../store/AppContext';

export function UsageScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, updateSettings, setDrawerOpen, navigate, goBack } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const quotas = [
    { label: 'Chat', used: 29, limit: '40,000', ratio: 29 / 40000 },
    { label: 'Fim', used: 0, limit: '24,000', ratio: 0 },
    { label: 'Nes', used: 0, limit: '1,000', ratio: 0 },
    { label: 'Embedding', used: 0, limit: '1,000,000,000', ratio: 0 },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}>
      {/* Authentic Header matching screenshot */}
      <ChatHeader
        theme={theme}
        isDark={isDark}
        onLeadingTap={() => setDrawerOpen(true)}
        onTerminalTap={() => navigate('code')}
        onThemeTap={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top Title & Refresh Row */}
        <View style={styles.titleRow}>
          <Text style={[styles.mainTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Usage
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRefresh}
            style={[styles.refreshBtn, { borderColor: '#2E322C' }]}>
            <RefreshIcon size={18} color="#ECEEEC" />
          </TouchableOpacity>
        </View>

        {/* Plan Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: '#71767B', fontFamily: monoFont }]}>
            Plan
          </Text>
          <Text style={[styles.planValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Power
          </Text>
          <Text style={[styles.activeStatus, { color: '#71767B', fontFamily: monoFont }]}>
            active
          </Text>
        </View>

        {/* Billing Period Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: '#71767B', fontFamily: monoFont }]}>
            Billing period
          </Text>
          <Text style={[styles.periodValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Sep 26, 2026
          </Text>
          <Text style={[styles.periodSub, { color: '#71767B', fontFamily: monoFont }]}>
            to Oct 26, 2026
          </Text>
        </View>

        {/* Tokens Used Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: '#71767B', fontFamily: monoFont }]}>
            Tokens used
          </Text>
          <Text style={[styles.periodValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            0
          </Text>
          <View style={[styles.divider, { backgroundColor: '#262925' }]} />
        </View>

        {/* Quotas Section */}
        <View style={styles.quotasBlock}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Quotas
          </Text>

          {quotas.map((q, idx) => (
            <View key={idx} style={styles.quotaItem}>
              <View style={styles.quotaRow}>
                <Text style={[styles.quotaLabel, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {q.label}
                </Text>
                <Text style={[styles.quotaValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {q.used} / {q.limit}
                </Text>
              </View>
              {/* Progress Line */}
              <View style={[styles.progressTrack, { backgroundColor: '#262925' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(q.ratio * 100, q.used > 0 ? 3 : 0)}%`,
                      backgroundColor: '#35D6B4',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Request History Section */}
        <View style={styles.requestHistoryBlock}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Request history
          </Text>
          <Text style={[styles.fromLabel, { color: '#71767B', fontFamily: monoFont }]}>
            From
          </Text>

          <View style={[styles.dateInputBox, { borderColor: '#262925', backgroundColor: '#141613' }]}>
            <Text style={[styles.datePlaceholder, { color: '#71767B', fontFamily: monoFont }]}>
              mm/dd/yyyy
            </Text>
            <CalendarIcon size={18} color="#71767B" />
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161815',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  planValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  activeStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  periodValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodSub: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
    marginTop: 18,
  },
  quotasBlock: {
    marginTop: 6,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  quotaItem: {
    marginBottom: 16,
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quotaLabel: {
    fontSize: 13,
  },
  quotaValue: {
    fontSize: 13,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  requestHistoryBlock: {
    marginTop: 8,
  },
  fromLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  dateInputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePlaceholder: {
    fontSize: 14,
  },
});
