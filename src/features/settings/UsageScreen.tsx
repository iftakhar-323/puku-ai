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
  CalendarIcon,
  MoonIcon,
  RefreshIcon,
  SidebarToggleIcon,
  SunIcon,
  TerminalPromptIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

export function UsageScreen() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const { theme, isDark, updateSettings, setDrawerOpen, navigate } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

  const requestHistory = [
    { date: 'Sep 26, 2026', service: 'Chat', requests: 17 },
    { date: 'Sep 27, 2026', service: 'Chat', requests: 11 },
    { date: 'Sep 28, 2026', service: 'Chat', requests: 1 },
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
      {/* Authentic Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDrawerOpen(true)}
          style={styles.actionBtn}>
          <SidebarToggleIcon size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.trailingGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('code')}
            style={styles.actionBtn}>
            <TerminalPromptIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('pukuBot')}
            style={styles.actionBtn}>
            <BotIcon size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
            style={styles.actionBtn}>
            {isDark ? (
              <SunIcon size={20} color={theme.textPrimary} />
            ) : (
              <MoonIcon size={20} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === 'android' && keyboardHeight > 0
                ? keyboardHeight + 28
                : Math.max(insets.bottom, 28),
          },
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
            style={[styles.refreshBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <RefreshIcon size={18} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Plan Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
            Plan
          </Text>
          <Text style={[styles.planValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Power
          </Text>
          <Text style={[styles.activeStatus, { color: theme.textMuted, fontFamily: monoFont }]}>
            active
          </Text>
        </View>

        {/* Billing Period Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
            Billing period
          </Text>
          <Text style={[styles.periodValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            Sep 26, 2026
          </Text>
          <Text style={[styles.periodSub, { color: theme.textMuted, fontFamily: monoFont }]}>
            to Oct 26, 2026
          </Text>
        </View>

        {/* Tokens Used Section */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.metaLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
            Tokens used
          </Text>
          <Text style={[styles.periodValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            0
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
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
              {/* Progress Track */}
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
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

          {/* From Input */}
          <Text style={[styles.inputLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
            From
          </Text>
          <View style={[styles.dateInputBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={theme.placeholderText}
              style={[styles.dateTextInput, { color: theme.textPrimary, fontFamily: monoFont }]}
            />
            <CalendarIcon size={18} color={theme.textMuted} />
          </View>

          {/* To Input */}
          <Text style={[styles.inputLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
            To
          </Text>
          <View style={[styles.dateInputBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={theme.placeholderText}
              style={[styles.dateTextInput, { color: theme.textPrimary, fontFamily: monoFont }]}
            />
            <CalendarIcon size={18} color={theme.textMuted} />
          </View>

          {/* Apply Dates Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.applyDatesBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.applyDatesText, { color: theme.textPrimary, fontFamily: monoFont }]}>
              Apply dates
            </Text>
          </TouchableOpacity>

          {/* Request History Table */}
          <View style={styles.historyTable}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colHeader, { flex: 2, color: theme.textMuted, fontFamily: monoFont }]}>
                Date
              </Text>
              <Text style={[styles.colHeader, { flex: 1.5, color: theme.textMuted, fontFamily: monoFont }]}>
                Service
              </Text>
              <Text style={[styles.colHeader, { flex: 1, textAlign: 'right', color: theme.textMuted, fontFamily: monoFont }]}>
                Requests
              </Text>
            </View>

            <View style={[styles.tableDivider, { backgroundColor: theme.border }]} />

            {/* Table Rows */}
            {requestHistory.map((row, index) => (
              <View key={index}>
                <View style={styles.tableDataRow}>
                  <Text style={[styles.cellText, { flex: 2, color: theme.textPrimary, fontFamily: monoFont }]}>
                    {row.date}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1.5, color: theme.textPrimary, fontFamily: monoFont }]}>
                    {row.service}
                  </Text>
                  <Text style={[styles.cellText, { flex: 1, textAlign: 'right', color: theme.textPrimary, fontFamily: monoFont }]}>
                    {row.requests}
                  </Text>
                </View>
                <View style={[styles.tableDivider, { backgroundColor: theme.border }]} />
              </View>
            ))}
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
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  sectionBlock: {
    marginBottom: 18,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  planValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  activeStatus: {
    fontSize: 12,
  },
  periodValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  periodSub: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    width: '100%',
    marginTop: 22,
    marginBottom: 6,
  },
  quotasBlock: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  quotaItem: {
    marginBottom: 18,
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
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  requestHistoryBlock: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  applyDatesBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
  },
  applyDatesText: {
    fontSize: 13,
  },
  historyTable: {
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  colHeader: {
    fontSize: 12,
  },
  tableDivider: {
    height: 1,
    width: '100%',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cellText: {
    fontSize: 13,
  },
});
