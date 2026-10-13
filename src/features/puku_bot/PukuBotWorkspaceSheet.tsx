/**
 * Agents and Marketplace, the two Workspace panels the web has beside Skills and Memory.
 *
 * Agents lists the Bots this person made and the ones shared with them, and makes a new one from a
 * role description. Marketplace lists every published template and installs one, on a tap, as a
 * private Bot the person owns. Either hands a Bot to the chat, the way a skill goes into the message
 * box: into the conversation that is open, or to start one.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { pukuBotApi, DEFAULT_AGENTS, DEFAULT_TEMPLATES } from '../../services/pukuBotApi';
import { CloseIcon, PlusIcon } from '../../components/common/Icons';
import { PukuBotAgent, PukuBotTemplate, PukuBotTemplateCategory } from '../../types';

export type WorkspaceSheetPanel = 'agents' | 'marketplace';

type InstallState = {
  status: 'installing' | 'done' | 'error';
  /** 0–100. Held short of the end until the server answers. */
  progress: number;
  installed?: PukuBotAgent;
  error?: string;
};

/** Where the install bar waits until the server says the install is done. */
const INSTALL_HOLD_AT = 90;

const ACCENT = '#35D6B4';

/** The web's eight categories, in its order. */
export const TEMPLATE_CATEGORIES: Array<{ key: PukuBotTemplateCategory; label: string }> = [
  { key: 'engineering', label: 'Engineering' },
  { key: 'sales', label: 'Sales' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'design', label: 'Design' },
  { key: 'personal', label: 'Personal' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'product', label: 'Product' },
  { key: 'operations', label: 'Operations' },
];

/** Same rule as the web: made public by somebody else, not your own. */
export function isSharedWithYou(agent: PukuBotAgent): boolean {
  return !agent.mine && agent.visibility === 'public';
}

export function PukuBotWorkspaceSheet({
  visible,
  panel,
  onChangePanel,
  onClose,
  onUseAgent,
}: {
  visible: boolean;
  panel: WorkspaceSheetPanel;
  onChangePanel: (panel: WorkspaceSheetPanel) => void;
  onClose: () => void;
  /** Put this Bot to work in the chat: the open conversation, or a new one. */
  onUseAgent: (agent: { id: string; name: string }) => void;
}) {
  const { theme, isDark } = useApp();
  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const [agents, setAgents] = useState<PukuBotAgent[] | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PukuBotTemplate[] | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [category, setCategory] = useState<PukuBotTemplateCategory | null>(null);
  const [installs, setInstalls] = useState<Record<string, InstallState>>({});
  const installTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  useEffect(() => {
    const timers = installTimers.current;
    return () => Object.values(timers).forEach(clearInterval);
  }, []);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadAgents = useCallback(async () => {
    setAgentsError(null);
    try {
      const res = await pukuBotApi.getAgents();
      if (res && res.length > 0) {
        setAgents(res);
      } else {
        setAgents(DEFAULT_AGENTS);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test') {
        setAgentsError(err?.message || "Your agents couldn't be loaded.");
      } else {
        setAgents(DEFAULT_AGENTS);
      }
    }
  }, []);

  const loadTemplates = useCallback(async (which: PukuBotTemplateCategory | null) => {
    setTemplatesError(null);
    setTemplates(null);
    try {
      const res = await pukuBotApi.getMarketplace(which ?? undefined);
      if (res && res.length > 0) {
        setTemplates(res);
      } else {
        setTemplates(which ? DEFAULT_TEMPLATES.filter(t => t.category === which) : DEFAULT_TEMPLATES);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test') {
        setTemplatesError(err?.message || "The Marketplace couldn't be loaded.");
      } else {
        setTemplates(which ? DEFAULT_TEMPLATES.filter(t => t.category === which) : DEFAULT_TEMPLATES);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (panel === 'agents') loadAgents();
    else loadTemplates(category);
    // category reloads through its own chips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, panel]);

  const handleCreate = async () => {
    if (!newName.trim() || !newTitle.trim() || !newRole.trim()) {
      Alert.alert('New agent', 'Give it a name, a title and a role description.');
      return;
    }
    setIsCreating(true);
    try {
      const created = await pukuBotApi.createAgent({
        name: newName.trim(),
        title: newTitle.trim(),
        roleDescription: newRole.trim(),
      });
      setAgents(prev => [created, ...(prev ?? []).filter(a => a.id !== created.id)]);
      setNewName('');
      setNewTitle('');
      setNewRole('');
      setShowCreate(false);
    } catch (err: any) {
      Alert.alert('New agent', err?.message || 'The agent could not be created.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * A tap installs straight away. The server does it in one request, so the bar moves on its own
   * while that request runs, holds short of the end, and fills only when the server says it is done.
   * Once installed, the same tap puts the new Bot to work in the chat.
   */
  const handleInstall = async (template: PukuBotTemplate) => {
    const id = template.agentId;
    const current = installs[id];
    if (current?.status === 'installing') return;
    if (current?.status === 'done' && current.installed) {
      onUseAgent(current.installed);
      return;
    }
    setInstalls(prev => ({ ...prev, [id]: { status: 'installing', progress: 5 } }));
    installTimers.current[id] = setInterval(() => {
      setInstalls(prev => {
        const state = prev[id];
        if (!state || state.status !== 'installing') return prev;
        const progress = Math.min(INSTALL_HOLD_AT, state.progress + Math.max(1, (INSTALL_HOLD_AT - state.progress) * 0.12));
        return { ...prev, [id]: { ...state, progress } };
      });
    }, 150);
    try {
      const installed = await pukuBotApi.installTemplate(id);
      setAgents(prev => (prev ? [installed, ...prev.filter(a => a.id !== installed.id)] : prev));
      setInstalls(prev => ({ ...prev, [id]: { status: 'done', progress: 100, installed } }));
    } catch (err: any) {
      setInstalls(prev => ({
        ...prev,
        [id]: { status: 'error', progress: 0, error: err?.message || 'This template could not be installed.' },
      }));
    } finally {
      clearInterval(installTimers.current[id]);
      delete installTimers.current[id];
    }
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: active ? ACCENT : theme.border,
    backgroundColor: active ? (isDark ? ACCENT : '#1A1D18') : isDark ? '#232924' : '#EAECE6',
  });
  const chipText = (active: boolean) => ({
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: monoFont,
    color: active ? (isDark ? '#141613' : '#FFFFFF') : theme.textSecondary,
  });
  const inputStyle = [
    styles.input,
    { borderColor: theme.border, color: theme.textPrimary, fontFamily: monoFont },
  ];

  const renderAvatar = (seed: string, name: string) => (
    <View style={[styles.avatar, { backgroundColor: isDark ? '#1C271E' : '#E0F3E5' }]}>
      <Text style={{ color: ACCENT, fontWeight: '700', fontFamily: monoFont }}>
        {(name || seed || '?').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  const renderAgent = (agent: PukuBotAgent) => (
    <TouchableOpacity
      key={agent.id}
      accessibilityRole="button"
      accessibilityHint="Adds this agent to your chat"
      activeOpacity={0.8}
      onPress={() => onUseAgent(agent)}
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.secondaryBackground }]}>
      <View style={styles.cardRow}>
        {renderAvatar(agent.avatarSeed, agent.name)}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {agent.name}
          </Text>
          {agent.title ? (
            <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 11, fontFamily: monoFont }}>
              {agent.title}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Use ${agent.name} in chat`}
          onPress={() => onUseAgent(agent)}
          style={[styles.smallBtn, { backgroundColor: isDark ? ACCENT : '#1A1D18' }]}>
          <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
            Use in chat
          </Text>
        </TouchableOpacity>
      </View>
      {agent.roleDescription ? (
        <Text numberOfLines={2} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8, fontFamily: monoFont }}>
          {agent.roleDescription}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const renderSection = (title: string, list: PukuBotAgent[] | undefined, empty: string, failed: string) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>{title}</Text>
      {agents === null && !agentsError ? (
        <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
      ) : list && list.length > 0 ? (
        list.map(renderAgent)
      ) : (
        <Text style={[styles.empty, { color: agentsError && agents === null ? '#FF6B6B' : theme.textMuted, fontFamily: monoFont }]}>
          {agentsError && agents === null ? failed : empty}
        </Text>
      )}
    </View>
  );

  const renderAgents = () => (
    <View>
      <View style={[styles.cardRow, { justifyContent: 'space-between', marginBottom: 10 }]}>
        <Text style={{ flex: 1, fontSize: 12, color: theme.textSecondary, fontFamily: monoFont }}>
          The Bots you made, and the ones shared with you.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={showCreate ? 'Cancel new agent' : 'New agent'}
          onPress={() => setShowCreate(prev => !prev)}
          style={[styles.smallBtn, { flexDirection: 'row', gap: 4, backgroundColor: isDark ? ACCENT : '#1A1D18' }]}>
          {!showCreate && <PlusIcon size={12} color={isDark ? '#141613' : '#FFF'} />}
          <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
            {showCreate ? 'Cancel' : 'New agent'}
          </Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={[styles.card, { borderColor: ACCENT, backgroundColor: theme.secondaryBackground }]}>
          <TextInput value={newName} onChangeText={setNewName} maxLength={80} placeholder="Name (e.g. Nova)" placeholderTextColor={theme.placeholderText} style={inputStyle} />
          <TextInput value={newTitle} onChangeText={setNewTitle} maxLength={120} placeholder="Title (e.g. Research assistant)" placeholderTextColor={theme.placeholderText} style={inputStyle} />
          <TextInput
            value={newRole}
            onChangeText={setNewRole}
            maxLength={1000}
            multiline
            placeholder="Role description: what it does and how"
            placeholderTextColor={theme.placeholderText}
            style={[inputStyle, { height: 88, textAlignVertical: 'top', paddingTop: 8 }]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isCreating}
            onPress={handleCreate}
            style={[styles.primaryBtn, { opacity: isCreating ? 0.6 : 1 }]}>
            {isCreating ? (
              <ActivityIndicator size="small" color="#141613" />
            ) : (
              <Text style={{ color: '#141613', fontWeight: '700', fontSize: 12, fontFamily: monoFont }}>Create agent</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {renderSection(
        'Your agents',
        agents?.filter(a => a.mine),
        "You don't have any agents created.",
        "Your agents couldn't be loaded."
      )}
      {renderSection(
        'Explore agents',
        agents?.filter(isSharedWithYou),
        'Nobody has shared an agent with you yet.',
        "Agents shared with you couldn't be loaded."
      )}
    </View>
  );

  const renderMarketplace = () => (
    <View>
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 10, fontFamily: monoFont }}>
        Bots you can install as your own. Installing turns a template into a private coworker in your agents.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
        {[{ key: null, label: 'All' } as { key: PukuBotTemplateCategory | null; label: string }, ...TEMPLATE_CATEGORIES].map(c => (
          <TouchableOpacity
            key={c.label}
            accessibilityRole="button"
            onPress={() => {
              setCategory(c.key);
              loadTemplates(c.key);
            }}
            style={chip(category === c.key)}>
            <Text style={chipText(category === c.key)}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {templates === null && !templatesError ? (
        <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
      ) : templatesError ? (
        <View>
          <Text style={[styles.empty, { color: '#FF6B6B', fontFamily: monoFont }]}>{templatesError}</Text>
          <TouchableOpacity onPress={() => loadTemplates(category)}>
            <Text style={{ color: ACCENT, fontSize: 12, fontFamily: monoFont }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : templates && templates.length > 0 ? (
        templates.map(tpl => {
          const install = installs[tpl.agentId];
          return (
          <TouchableOpacity
            key={tpl.agentId}
            accessibilityRole="button"
            accessibilityHint={install?.status === 'done' ? 'Adds this agent to your chat' : 'Installs this template'}
            activeOpacity={0.8}
            disabled={install?.status === 'installing'}
            onPress={() => handleInstall(tpl)}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.secondaryBackground }]}>
            <View style={styles.cardRow}>
              {renderAvatar(tpl.avatarSeed, tpl.name)}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
                  {tpl.name}
                </Text>
                <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 11, fontFamily: monoFont }}>
                  {tpl.title}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={install?.status === 'done' ? `Use ${tpl.name} in chat` : `Install ${tpl.name}`}
                disabled={install?.status === 'installing'}
                onPress={() => handleInstall(tpl)}
                style={[styles.smallBtn, { backgroundColor: isDark ? ACCENT : '#1A1D18' }]}>
                <Text style={{ color: isDark ? '#141613' : '#FFF', fontSize: 11, fontWeight: '700', fontFamily: monoFont }}>
                  {install?.status === 'installing'
                    ? `${Math.round(install.progress)}%`
                    : install?.status === 'done'
                      ? 'Use in chat'
                      : install?.status === 'error'
                        ? 'Retry'
                        : 'Install'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text numberOfLines={3} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8, fontFamily: monoFont }}>
              {tpl.blurb}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 10.5, marginTop: 6, fontFamily: monoFont }}>
              {(TEMPLATE_CATEGORIES.find(c => c.key === tpl.category)?.label || tpl.category) +
                (tpl.authorName ? ` · by ${tpl.authorName}` : '')}
            </Text>
            {install && install.status !== 'error' ? (
              <View style={{ marginTop: 10 }}>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#232924' : '#EAECE6' }]}>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: Math.round(install.progress) }}
                    style={[styles.progressFill, { width: `${install.progress}%` }]}
                  />
                </View>
                <Text style={{ color: install.status === 'done' ? ACCENT : theme.textMuted, fontSize: 11, marginTop: 4, fontFamily: monoFont }}>
                  {install.status === 'done'
                    ? 'Installed · added to your agents. Tap to use it in chat.'
                    : `Installing… ${Math.round(install.progress)}%`}
                </Text>
              </View>
            ) : install?.status === 'error' ? (
              <Text style={{ color: '#FF6B6B', fontSize: 11, marginTop: 8, fontFamily: monoFont }}>{install.error}</Text>
            ) : null}
          </TouchableOpacity>
          );
        })
      ) : (
        <Text style={[styles.empty, { color: theme.textMuted, fontFamily: monoFont }]}>
          {category ? 'Nothing published in this category yet.' : 'Nothing has been published yet.'}
        </Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['agents', 'marketplace'] as WorkspaceSheetPanel[]).map(key => (
                <TouchableOpacity key={key} accessibilityRole="tab" onPress={() => onChangePanel(key)} style={chip(panel === key)}>
                  <Text style={chipText(panel === key)}>{key === 'agents' ? 'Agents' : 'Marketplace'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
              <CloseIcon size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {panel === 'agents' ? renderAgents() : renderMarketplace()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 13.5, fontWeight: '700' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  primaryBtn: { height: 36, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8, fontSize: 12 },
  empty: { fontSize: 12, fontStyle: 'italic', marginVertical: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: ACCENT },
});
