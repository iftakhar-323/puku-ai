import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  PukuBotUser,
  PukuBotItem,
  PukuBotSkill,
  PukuBotMemory,
  PukuBotRoutine,
  PukuBotConnection,
} from '../../types';
import { toSkillSlug } from '../../services/pukuBotApi';
import { PukuBotOutboxEntry } from '../../services/pukuBotOutbox';
import { CloseIcon, TrashIcon } from '../../components/common/Icons';
import { ENV } from '../../config/env';
import { styles } from './pukuBotStyles';

export type SettingsTab = 'profile' | 'instructions' | 'memory' | 'routines' | 'skills' | 'connections';

export const MAX_INSTRUCTIONS_LENGTH = 10000;

export interface PukuBotSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  isDark: boolean;
  monoFont: string;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;
  outboxEntries: PukuBotOutboxEntry[];
  outboxNotice: string | null;
  customApiUrl: string;
  setCustomApiUrl: (url: string) => void;
  isAuthenticated: boolean;
  botUser: PukuBotUser | null;
  handleSignOut: () => void;
  handleDeleteAccount: () => void;
  handleConnectAuth: () => void;
  isConnectingAuth: boolean;
  instructionsText: string;
  setInstructionsText: (text: string) => void;
  isSavingInstructions: boolean;
  handleSaveInstructions: () => void;
  availableBots: PukuBotItem[];
  shownMemoryBotId: string;
  setMemoryBotId: (id: string) => void;
  newMemoryInput: string;
  setNewMemoryInput: (text: string) => void;
  handleAddMemory: () => void;
  isLoadingMemories: boolean;
  memoriesList: PukuBotMemory[];
  handleDeleteMemory: (id: string) => void;
  sharingMemoryId: string | null;
  setSharingMemoryId: React.Dispatch<React.SetStateAction<string | null>>;
  handleShareMemory: (memId: string, botId: string) => void;
  routinesList: PukuBotRoutine[];
  handleToggleRoutine: (id: string, current: boolean) => void;
  handleDeleteRoutine: (id: string) => void;
  userSkillsList: PukuBotSkill[];
  showAddSkillForm: boolean;
  setShowAddSkillForm: React.Dispatch<React.SetStateAction<boolean>>;
  newSkillName: string;
  setNewSkillName: (text: string) => void;
  newSkillSlug: string;
  setNewSkillSlug: (text: string) => void;
  newSkillPrompt: string;
  setNewSkillPrompt: (text: string) => void;
  handleSaveSkill: () => void;
  handleDeleteSkill: (slug: string) => void;
  handleUseSkill: (slug: string) => void;
  connectionsNotice: string | null;
  connectionsList: PukuBotConnection[];
  handleToggleConnection: (conn: PukuBotConnection) => void;
}

export const PukuBotSettingsModal: React.FC<PukuBotSettingsModalProps> = ({
  visible,
  onClose,
  theme,
  isDark,
  monoFont,
  activeSettingsTab,
  setActiveSettingsTab,
  outboxEntries,
  outboxNotice,
  customApiUrl,
  setCustomApiUrl,
  isAuthenticated,
  botUser,
  handleSignOut,
  handleDeleteAccount,
  handleConnectAuth,
  isConnectingAuth,
  instructionsText,
  setInstructionsText,
  isSavingInstructions,
  handleSaveInstructions,
  availableBots,
  shownMemoryBotId,
  setMemoryBotId,
  newMemoryInput,
  setNewMemoryInput,
  handleAddMemory,
  isLoadingMemories,
  memoriesList,
  handleDeleteMemory,
  sharingMemoryId,
  setSharingMemoryId,
  handleShareMemory,
  routinesList,
  handleToggleRoutine,
  handleDeleteRoutine,
  userSkillsList,
  showAddSkillForm,
  setShowAddSkillForm,
  newSkillName,
  setNewSkillName,
  newSkillSlug,
  setNewSkillSlug,
  newSkillPrompt,
  setNewSkillPrompt,
  handleSaveSkill,
  handleDeleteSkill,
  handleUseSkill,
  connectionsNotice,
  connectionsList,
  handleToggleConnection,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, maxHeight: '88%' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
              {t('pukuBot.settingsTitle')}
            </Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
              <CloseIcon size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Navigation */}
          <View style={{ paddingTop: 10, paddingBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(
                [
                  { key: 'profile', label: 'General' },
                  { key: 'instructions', label: 'Instructions' },
                  { key: 'memory', label: 'Memory' },
                  { key: 'routines', label: 'Routines' },
                  { key: 'skills', label: 'Skills' },
                  { key: 'connections', label: 'Accounts' },
                ] as Array<{ key: SettingsTab; label: string }>
              ).map(tab => {
                const isActive = activeSettingsTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveSettingsTab(tab.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 14,
                      backgroundColor: isActive
                        ? (isDark ? '#35D6B4' : '#1A1D18')
                        : (isDark ? '#232924' : '#EAECE6'),
                      borderWidth: 1,
                      borderColor: isActive ? '#35D6B4' : theme.border,
                    }}>
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isActive ? '700' : '500',
                        color: isActive ? (isDark ? '#141613' : '#FFFFFF') : theme.textSecondary,
                        fontFamily: monoFont,
                      }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {outboxEntries.length > 0 && (
            <View
              style={{
                marginVertical: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: isDark ? '#1C271E' : '#E9F5EB',
                borderWidth: 1,
                borderColor: isDark ? '#2D5E37' : '#BEE2C7',
              }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isDark ? '#94C7A0' : '#2D7543',
                  fontFamily: monoFont,
                }}>
                {outboxEntries.length === 1
                  ? '1 change waiting to sync'
                  : `${outboxEntries.length} changes waiting to sync`}
              </Text>
            </View>
          )}

          {!!outboxNotice && (
            <View
              style={{
                marginVertical: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: isDark ? '#2E1A1A' : '#FDECEC',
                borderWidth: 1,
                borderColor: isDark ? '#5E2D2D' : '#F5C2C2',
              }}>
              <Text
                style={{
                  fontSize: 11,
                  color: isDark ? '#F87171' : '#DC2626',
                  fontFamily: monoFont,
                }}>
                {outboxNotice}
              </Text>
            </View>
          )}

          <ScrollView style={{ paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
            {/* TAB 1: Profile & General */}
            {activeSettingsTab === 'profile' && (
              <View>
                <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: monoFont }]}>
                  {t('pukuBot.apiBaseUrlLabel')}
                </Text>
                <TextInput
                  value={__DEV__ ? customApiUrl : ENV.PUKU_BOT_API_BASE_URL}
                  onChangeText={__DEV__ ? setCustomApiUrl : undefined}
                  editable={__DEV__}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://app.bot.puku.sh/api/v1"
                  placeholderTextColor={theme.placeholderText}
                  style={[
                    styles.settingsInput,
                    {
                      color: __DEV__ ? theme.textPrimary : theme.textMuted,
                      borderColor: theme.border,
                      fontFamily: monoFont,
                    },
                  ]}
                />

                {__DEV__ && (
                  <View style={styles.quickEnvRow}>
                    <TouchableOpacity
                      onPress={() => setCustomApiUrl(ENV.PUKU_BOT_API_BASE_URL)}
                      style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                      <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {t('pukuBot.envCloudProd')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setCustomApiUrl(ENV.PUKU_BOT_LOCAL_BASE_URL)}
                      style={[styles.quickEnvPill, { borderColor: theme.border }]}>
                      <Text style={[styles.quickEnvText, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {t('pukuBot.envLocal')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Account Status Box */}
                <View style={[styles.accountBox, { borderColor: theme.border }]}>
                  {isAuthenticated ? (
                    <View>
                      <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                        {t('pukuBot.signedInAs')}
                      </Text>
                      <Text style={[styles.accountEmail, { color: theme.textSecondary, fontFamily: monoFont }]}>
                        {botUser?.email || t('pukuBot.defaultUserFallback')}
                      </Text>

                      <TouchableOpacity
                        onPress={handleSignOut}
                        style={[styles.signOutBtn, { borderColor: '#FF4D4F', marginBottom: 12 }]}>
                        <Text style={[styles.signOutText, { color: '#FF4D4F', fontFamily: monoFont }]}>
                          {t('pukuBot.signOut')}
                        </Text>
                      </TouchableOpacity>

                      {/* Danger Zone: Account Deletion */}
                      <TouchableOpacity
                        onPress={handleDeleteAccount}
                        style={[styles.signOutBtn, { borderColor: 'rgba(255, 77, 79, 0.4)', backgroundColor: 'rgba(255, 77, 79, 0.08)' }]}>
                        <Text style={[styles.signOutText, { color: '#FF4D4F', fontFamily: monoFont, fontSize: 11 }]}>
                          Delete Account & Data
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <Text style={[styles.accountTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                        {t('pukuBot.connectTitle')}
                      </Text>
                      <Text style={[styles.accountDesc, { color: theme.textMuted, fontFamily: monoFont }]}>
                        {t('pukuBot.connectDescription')}
                      </Text>

                      <TouchableOpacity
                        disabled={isConnectingAuth}
                        onPress={handleConnectAuth}
                        style={[styles.signInBtn, { backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }]}>
                        {isConnectingAuth ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.signInBtnText, { color: isDark ? '#141613' : '#FFFFFF', fontFamily: monoFont }]}>
                            {t('pukuBot.signInButton')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: Personal Instructions */}
            {activeSettingsTab === 'instructions' && (
              <View>
                {outboxEntries.some(e => e.path === '/settings/instructions') && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                  Personal instructions on how your Bots should talk to you (tone, brevity, formatting):
                </Text>
                <TextInput
                  value={instructionsText}
                  onChangeText={setInstructionsText}
                  maxLength={MAX_INSTRUCTIONS_LENGTH}
                  multiline
                  numberOfLines={6}
                  placeholder="e.g. Always be concise. Format code in clean TypeScript. Do not explain basics."
                  placeholderTextColor={theme.placeholderText}
                  style={{
                    minHeight: 120,
                    maxHeight: 180,
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.secondaryBackground,
                    color: theme.textPrimary,
                    fontFamily: monoFont,
                    fontSize: 12.5,
                    textAlignVertical: 'top',
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: monoFont }}>
                    {instructionsText.length}/{MAX_INSTRUCTIONS_LENGTH} chars
                  </Text>
                  <TouchableOpacity
                    disabled={isSavingInstructions}
                    onPress={handleSaveInstructions}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#35D6B4' : '#1A1D18',
                    }}>
                    {isSavingInstructions ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={{ color: isDark ? '#141613' : '#FFF', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                        Save Instructions
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 3: Memories */}
            {activeSettingsTab === 'memory' && (
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                  What your Bots remember about you and your work. The Bot reads these at the top of every turn.
                </Text>
                {/* Memory is per Bot: pick whose */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
                  {availableBots.map(bot => {
                    const isActive = bot.id === shownMemoryBotId;
                    return (
                      <TouchableOpacity
                        key={bot.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setMemoryBotId(bot.id);
                          setSharingMemoryId(null);
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: isActive ? '#35D6B4' : theme.border,
                          backgroundColor: isActive ? 'rgba(53, 214, 180, 0.15)' : 'transparent',
                        }}>
                        <Text style={{ fontSize: 11.5, color: isActive ? '#35D6B4' : theme.textSecondary, fontFamily: monoFont }}>
                          {bot.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    value={newMemoryInput}
                    onChangeText={setNewMemoryInput}
                    maxLength={1000}
                    placeholder="A fact the Bot should know..."
                    placeholderTextColor={theme.placeholderText}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 10,
                      color: theme.textPrimary,
                      fontSize: 12,
                      fontFamily: monoFont,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAddMemory}
                    style={{
                      height: 38,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#35D6B4' : '#1A1D18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ color: isDark ? '#141613' : '#FFF', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                      Remember
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingMemories && memoriesList.length === 0 ? (
                  <ActivityIndicator color="#35D6B4" style={{ marginVertical: 12 }} />
                ) : memoriesList.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                    Nothing remembered yet. Add a fact the Bot should know.
                  </Text>
                ) : (
                  memoriesList.map(mem => (
                    <View
                      key={mem.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.secondaryBackground,
                        marginBottom: 8,
                      }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 12.5, fontFamily: monoFont }}>
                        {mem.content}
                      </Text>
                      {(mem.id.startsWith('mem_') || outboxEntries.some(e => e.path.includes(mem.id))) && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 4 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 10.5, color: theme.textMuted, fontFamily: monoFont }}>
                          {mem.kind || 'fact'}
                          {mem.useCount ? ` · used ${mem.useCount}×` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {availableBots.length > 1 && !mem.id.startsWith('mem_') && (
                            <TouchableOpacity
                              accessibilityRole="button"
                              onPress={() => setSharingMemoryId(prev => (prev === mem.id ? null : mem.id))}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: sharingMemoryId === mem.id ? '#35D6B4' : theme.border,
                              }}>
                              <Text style={{ fontSize: 10.5, color: sharingMemoryId === mem.id ? '#35D6B4' : theme.textMuted, fontFamily: monoFont }}>
                                Share with…
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Forget" onPress={() => handleDeleteMemory(mem.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <TrashIcon size={14} color="#FF4D4F" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {sharingMemoryId === mem.id && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {availableBots
                            .filter(b => b.id !== shownMemoryBotId)
                            .map(b => (
                              <TouchableOpacity
                                key={b.id}
                                accessibilityRole="button"
                                onPress={() => handleShareMemory(mem.id, b.id)}
                                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                                <Text style={{ fontSize: 11, color: theme.textPrimary, fontFamily: monoFont }}>{b.name}</Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: Routines */}
            {activeSettingsTab === 'routines' && (
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                  Scheduled work and automated tasks:
                </Text>
                {routinesList.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                    No active routines. You can create one via chat (e.g. &quot;Every weekday at 9am, summarize GitHub PRs&quot;).
                  </Text>
                ) : (
                  routinesList.map(rt => (
                    <View
                      key={rt.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.secondaryBackground,
                        marginBottom: 8,
                      }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                            {rt.instruction}
                          </Text>
                          {outboxEntries.some(e => e.path.includes(rt.id)) && (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 2 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleToggleRoutine(rt.id, rt.enabled)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: rt.enabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                          }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: rt.enabled ? '#22C55E' : '#FF4D4F', fontFamily: monoFont }}>
                            {rt.enabled ? 'Enabled' : 'Paused'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4, fontFamily: monoFont }}>
                        Schedule: {rt.schedule}{rt.timezone ? ` (${rt.timezone})` : ''}
                      </Text>
                      {rt.nextRunAt ? (
                        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                          Next run: {new Date(rt.nextRunAt).toLocaleString()}
                        </Text>
                      ) : null}
                      <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                        <TouchableOpacity onPress={() => handleDeleteRoutine(rt.id)}>
                          <TrashIcon size={14} color="#FF4D4F" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 5: Skills */}
            {activeSettingsTab === 'skills' && (
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, fontFamily: monoFont }}>
                  A skill is a named instruction you invoke with / and a Bot follows. Yours are yours alone, and go on the Bots you own.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, fontFamily: monoFont }}>
                    Your skills
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddSkillForm(prev => !prev)}
                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#35D6B4' : '#1A1D18' }}>
                    <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
                      {showAddSkillForm ? 'Cancel' : '+ New skill'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showAddSkillForm && (
                  <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#35D6B4', marginBottom: 12, backgroundColor: theme.secondaryBackground }}>
                    <TextInput
                      value={newSkillName}
                      onChangeText={setNewSkillName}
                      maxLength={120}
                      placeholder="Title (e.g. Translate to French)"
                      placeholderTextColor={theme.placeholderText}
                      style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                    />
                    <TextInput
                      value={newSkillSlug}
                      onChangeText={text => setNewSkillSlug(text.toLowerCase())}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={40}
                      placeholder={`/${toSkillSlug(newSkillName) || 'slug'} (from the title)`}
                      placeholderTextColor={theme.placeholderText}
                      style={{ height: 36, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, marginBottom: 6, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont }}
                    />
                    <TextInput
                      value={newSkillPrompt}
                      onChangeText={setNewSkillPrompt}
                      multiline
                      placeholder="Instructions the Bot follows"
                      placeholderTextColor={theme.placeholderText}
                      style={{ minHeight: 80, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, paddingTop: 8, marginBottom: 8, color: theme.textPrimary, fontSize: 12, fontFamily: monoFont, textAlignVertical: 'top' }}
                    />
                    <TouchableOpacity
                      onPress={handleSaveSkill}
                      style={{ height: 34, borderRadius: 6, backgroundColor: '#35D6B4', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#141613', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>
                        Save skill
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(() => {
                  const renderSkill = (skill: PukuBotSkill, editable: boolean) => (
                    <TouchableOpacity
                      key={skill.slug}
                      accessibilityRole="button"
                      accessibilityHint={`Puts /${skill.slug} in the message box`}
                      activeOpacity={0.8}
                      onPress={() => handleUseSkill(skill.slug)}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.secondaryBackground,
                        marginBottom: 8,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 12.5, fontFamily: monoFont }}>
                          {skill.title}
                        </Text>
                        {outboxEntries.some(e => e.path.includes(skill.slug)) && (
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: isDark ? '#3D3418' : '#FEF3C7', alignSelf: 'flex-start', marginTop: 2 }}>
                            <Text style={{ fontSize: 9.5, fontWeight: '600', color: isDark ? '#FBBF24' : '#D97706', fontFamily: monoFont }}>Waiting to sync</Text>
                          </View>
                        )}
                        <Text style={{ color: '#35D6B4', fontSize: 12, marginTop: 2, fontFamily: monoFont }}>
                          /{skill.slug}
                        </Text>
                        {skill.summary ? (
                          <Text numberOfLines={2} style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                            {skill.summary}
                          </Text>
                        ) : null}
                      </View>
                      {editable && (
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete /${skill.slug}`} onPress={() => handleDeleteSkill(skill.slug)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <TrashIcon size={14} color="#FF4D4F" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                  const mine = userSkillsList.filter(s => s.mine !== false && !s.deployment);
                  const workspace = userSkillsList.filter(s => s.deployment);
                  return (
                    <>
                      {mine.length === 0 ? (
                        <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 10, fontFamily: monoFont }}>
                          You don&apos;t have any skills yet.
                        </Text>
                      ) : (
                        mine.map(skill => renderSkill(skill, true))
                      )}
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 12, fontFamily: monoFont }}>
                        Workspace skills
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, marginBottom: 8, fontFamily: monoFont }}>
                        Written for everyone by an administrator. Change them on the web.
                      </Text>
                      {workspace.length === 0 ? (
                        <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 10, fontFamily: monoFont }}>
                          No workspace skills.
                        </Text>
                      ) : (
                        workspace.map(skill => renderSkill(skill, false))
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            {/* TAB 6: Connected Accounts */}
            {activeSettingsTab === 'connections' && (
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontFamily: monoFont }}>
                  Services a Bot reads as you, so it sees exactly what you can see:
                </Text>
                {connectionsNotice ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                    {connectionsNotice}
                  </Text>
                ) : connectionsList.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 12, fontFamily: monoFont }}>
                    No services to connect yet. An administrator adds them on the web.
                  </Text>
                ) : null}
                {connectionsList.map(conn => (
                  <View
                    key={conn.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.secondaryBackground,
                      marginBottom: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: monoFont }}>
                        {conn.name}
                      </Text>
                      {conn.vendor || conn.summary ? (
                        <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                          {[conn.vendor, conn.summary].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                      <Text style={{ color: conn.connected ? '#22C55E' : theme.textMuted, fontSize: 11, marginTop: 2, fontFamily: monoFont }}>
                        {conn.connected ? '● Connected' : '○ Not connected'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleConnection(conn)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: conn.connected ? 'rgba(255, 77, 79, 0.12)' : isDark ? '#35D6B4' : '#1A1D18',
                        borderWidth: conn.connected ? 1 : 0,
                        borderColor: '#FF4D4F',
                      }}>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: conn.connected ? '#FF4D4F' : isDark ? '#141613' : '#FFFFFF',
                          fontFamily: monoFont,
                        }}>
                        {conn.connected ? 'Disconnect' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
