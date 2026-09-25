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
import { AppHeader } from '../../components/common/AppHeader';
import {
  ProfileIcon,
  SettingsIcon,
} from '../../components/common/Icons';
import { pukuApi } from '../../services/api';
import { useApp } from '../../store/AppContext';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    profile,
    settings,
    updateSettings,
    navigate,
    logout,
  } = useApp();

  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [inputToken, setInputToken] = useState(pukuApi.getAuthToken() || '');
  const [testingToken, setTestingToken] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader showBack title="Settings" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Account Header Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigate('profile')}
          style={[
            styles.accountCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {profile.name ? profile.name[0].toUpperCase() : 'P'}
            </Text>
          </View>
          <View style={styles.accountInfo}>
            <Text
              numberOfLines={1}
              style={[styles.accountName, { color: theme.textPrimary }]}>
              {profile.name}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.accountEmail, { color: theme.textSecondary }]}>
              {profile.email}
            </Text>
          </View>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: theme.pillBackground },
            ]}>
            <Text style={[styles.planText, { color: theme.tagText }]}>
              {profile.plan}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Section: Appearance */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Theme Mode
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                {settings.themeMode === 'dark' ? 'Dark theme' : 'Light theme'}
              </Text>
            </View>
            <View style={styles.themeToggleRow}>
              <TouchableOpacity
                onPress={() => updateSettings({ themeMode: 'light' })}
                style={[
                  styles.themePill,
                  settings.themeMode === 'light'
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.buttonBackground },
                ]}>
                <Text
                  style={[
                    styles.themePillText,
                    {
                      color:
                        settings.themeMode === 'light'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}>
                  Light
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateSettings({ themeMode: 'dark' })}
                style={[
                  styles.themePill,
                  settings.themeMode === 'dark'
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.buttonBackground },
                ]}>
                <Text
                  style={[
                    styles.themePillText,
                    {
                      color:
                        settings.themeMode === 'dark'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}>
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section: Preferences */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Incognito by Default
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Never save chat history on startup
              </Text>
            </View>
            <Switch
              value={settings.isIncognitoDefault}
              onValueChange={val => updateSettings({ isIncognitoDefault: val })}
              trackColor={{ false: theme.outline, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Haptic Feedback
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Vibration on key events and buttons
              </Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={val => updateSettings({ hapticFeedback: val })}
              trackColor={{ false: theme.outline, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Stream Responses
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Typewriter animation during AI generation
              </Text>
            </View>
            <Switch
              value={settings.streamResponses}
              onValueChange={val => updateSettings({ streamResponses: val })}
              trackColor={{ false: theme.outline, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Account & Info */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          ABOUT & SYSTEM
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
              App Version
            </Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              1.0.3+8 (React Native Core)
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
              Organization
            </Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {profile.organization}
            </Text>
          </View>
        </View>

        {/* Section: Cloud & API */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          PUKU CLOUD & API
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'Puku Cloud Engine',
                `Status: ${pukuApi.getAuthToken() ? 'Connected with Cloud Token' : 'Active (Intelligent Offline Reasoning)'}\n\nEndpoint: ${pukuApi.getBaseUrl()}\n\nTip: You can login via Login Screen or enter token to stream live models.`
              );
            }}
            style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Cloud Token Status
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                {pukuApi.getAuthToken()
                  ? '••••••••' + pukuApi.getAuthToken()?.slice(-4) + ' (Active)'
                  : 'Operating via Intelligent Puku Engine'}
              </Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.tagText }]}>
              {pukuApi.getAuthToken() ? 'Connected' : 'Active'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const current = pukuApi.getBaseUrl();
              if (current.includes('dev')) {
                pukuApi.setEnvironment('prod');
                Alert.alert(
                  'Environment Changed',
                  'Switched to Production Server (https://api.puku.sh)'
                );
              } else {
                pukuApi.setEnvironment('dev');
                Alert.alert(
                  'Environment Changed',
                  'Switched to Dev Server (https://chat.api.dev.puku.sh)'
                );
              }
            }}
            style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Server Endpoint
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                {pukuApi.getBaseUrl()}
              </Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.tagText }]}>
              Switch
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setInputToken(pukuApi.getAuthToken() || '');
              setTokenModalVisible(true);
            }}
            style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Bearer Token / Senior Credential
              </Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                {pukuApi.getAuthToken()
                  ? 'Custom token configured (Tap to update)'
                  : 'Tap to enter or test live JWT token from senior'}
              </Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.tagText }]}>
              {pukuApi.getAuthToken() ? 'Edit' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.7}
          style={[styles.logoutBtn, { borderColor: theme.error }]}>
          <Text style={[styles.logoutText, { color: theme.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Senior Token Input Modal */}
      <Modal
        visible={tokenModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTokenModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.tokenModalBox,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.border,
              },
            ]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Backend Bearer Token
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.textSecondary },
              ]}>
              Paste the JWT / Bearer token provided by your senior to test live cloud streaming:
            </Text>
            <TextInput
              style={[
                styles.tokenInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              placeholder="Paste Bearer token here (or clear to reset)..."
              placeholderTextColor={theme.textMuted}
              value={inputToken}
              onChangeText={setInputToken}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setTokenModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={testingToken}
                onPress={async () => {
                  setTestingToken(true);
                  const trimmed = inputToken.trim();
                  pukuApi.setAuthToken(trimmed || null);
                  if (!trimmed) {
                    Alert.alert(
                      'Reset',
                      'Switched back to Intelligent Offline Engine.'
                    );
                    setTestingToken(false);
                    setTokenModalVisible(false);
                    return;
                  }
                  const isValid = await pukuApi.verifyAuth();
                  setTestingToken(false);
                  setTokenModalVisible(false);
                  if (isValid) {
                    Alert.alert(
                      'Success',
                      'Connected and verified with Puku Cloud Backend!'
                    );
                  } else {
                    Alert.alert(
                      'Token Saved',
                      'Token saved. Puku will send this Bearer token on cloud API requests.'
                    );
                  }
                }}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                  {testingToken ? 'Verifying...' : 'Save & Verify'}
                </Text>
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
  content: {
    padding: 16,
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    marginBottom: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 13,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  planText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  themePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tokenModalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tokenInput: {
    minHeight: 90,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
