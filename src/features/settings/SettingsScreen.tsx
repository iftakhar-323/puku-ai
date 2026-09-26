import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackIcon,
  BarChartIcon,
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  InfoIcon,
  LockIcon,
  LogoutIcon,
  ProfileIcon,
  SlidersIcon,
  VibrateIcon,
  VoiceIcon,
} from '../../components/common/Icons';
import { pukuApi } from '../../services/api';
import { useApp } from '../../store/AppContext';
import { AppColors } from '../../theme/colors';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    profile,
    settings,
    updateSettings,
    navigate,
    goBack,
    logout,
  } = useApp();

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [tokenInput, setTokenInput] = useState(pukuApi.getAuthToken() || '');

  const displayEmail =
    profile.email || 'Tap to sign in';
  const displayName =
    profile.name || (profile.email ? profile.email.split('@')[0] : 'Guest');
  const displayPlan = profile.email ? (profile.plan || 'Power') : 'Sign In';

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Puku account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. App Bar Header: < Settings ⓘ */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: theme.background,
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={goBack}
          style={styles.headerBtn}>
          <BackIcon size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Settings
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setInfoModalVisible(true)}
          style={styles.headerBtn}>
          <InfoIcon size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* 2. Account Header Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => (profile.email ? navigate('profile') : navigate('login'))}
          style={[
            styles.accountCard,
            { backgroundColor: theme.secondaryBackground },
          ]}>
          <View style={styles.accountTopRow}>
            <Text
              numberOfLines={2}
              style={[styles.accountEmail, { color: theme.textPrimary }]}>
              {displayEmail}
            </Text>

            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{displayPlan}</Text>
              <ChevronDownIcon size={14} color="#000000" />
            </View>
          </View>

          <View style={styles.accountBottomRow}>
            <BuildingIcon size={16} color={theme.textSecondary} />
            <Text
              numberOfLines={1}
              style={[styles.accountOrg, { color: theme.textSecondary }]}>
              {displayName}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. Section Card 1: Profile, Billing, Usage */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.secondaryBackground },
          ]}>
          {/* Profile */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('profile')}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <ProfileIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Profile
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Billing */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Billing', 'Active plan: ' + displayPlan)}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <CreditCardIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Billing
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Usage */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Usage', 'Unlimited fast queries enabled')}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <BarChartIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Usage
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 4. Section Card 2: Capabilities, Permissions, Voice */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.secondaryBackground },
          ]}>
          {/* Capabilities */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Capabilities', 'Web Search & Code Execution enabled')
            }
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <SlidersIcon size={20} color="#FFFFFF" />
            </View>
            <View style={styles.labelCol}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                Capabilities
              </Text>
              <Text style={[styles.rowSubLabel, { color: theme.textSecondary }]}>
                2 enabled
              </Text>
            </View>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Permissions */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Permissions', 'Microphone and network permissions active')
            }
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <LockIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Permissions
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Voice */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('liveVoice')}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <VoiceIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Voice
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 5. Section Card 3: Haptic feedback, Notifications, Shared links */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.secondaryBackground },
          ]}>
          {/* Haptic feedback */}
          <View style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <VibrateIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Haptic feedback
            </Text>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={val => updateSettings({ hapticFeedback: val })}
              trackColor={{
                false: '#342F50',
                true: theme.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Notifications */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifications', 'Push notifications enabled')}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <BellIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Notifications
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.outline }]} />

          {/* Shared links */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Shared Links', 'No active shared links')}
            style={styles.sectionRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.iconBackground },
              ]}>
              <ExternalLinkIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
              Shared links
            </Text>
            <ChevronRightIcon size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 6. Log out Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[
            styles.logoutCard,
            { backgroundColor: theme.secondaryBackground },
          ]}>
          <LogoutIcon size={22} color={AppColors.pumpkin} />
          <Text style={[styles.logoutText, { color: AppColors.pumpkin }]}>
            Log out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Info / Dev Token Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.secondaryBackground },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Puku AI Information
              </Text>
              <TouchableOpacity
                onPress={() => setInfoModalVisible(false)}
                style={styles.closeBtn}>
                <CloseIcon size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Version 1.0.0 (Production Release)
            </Text>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.textMuted }]}>
                ACTIVE ACCOUNT
              </Text>
              <Text style={[styles.modalValue, { color: theme.textPrimary }]}>
                {displayEmail}
              </Text>
              <Text style={[styles.modalValue, { color: theme.textSecondary }]}>
                Plan: {displayPlan} • Status: Active
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.textMuted }]}>
                AUTH TOKEN
              </Text>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Paste JWT / Bearer token"
                placeholderTextColor={theme.placeholderText}
                style={[
                  styles.tokenInput,
                  {
                    backgroundColor: theme.codeBackground,
                    color: theme.textPrimary,
                    borderColor: theme.outline,
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (tokenInput.trim()) {
                    pukuApi.setAuthToken(tokenInput.trim());
                    Alert.alert('Success', 'Auth token updated.');
                    setInfoModalVisible(false);
                  }
                }}
                style={[styles.saveTokenBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.saveTokenBtnText}>Save Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  accountCard: {
    borderRadius: 24,
    padding: 20,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountEmail: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  accountBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  accountOrg: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 24,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  labelCol: {
    flex: 1,
    marginLeft: 16,
  },
  rowSubLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 80,
  },
  logoutCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalValue: {
    fontSize: 15,
    marginBottom: 4,
  },
  tokenInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  saveTokenBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveTokenBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
