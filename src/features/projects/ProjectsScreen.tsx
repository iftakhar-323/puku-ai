import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/common/AppHeader';
import {
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { ProjectScope } from '../../types';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

export function ProjectsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, projects, createProject, selectProject, refreshProjects } = useApp();
  const { keyboardHeight } = useKeyboardHeight();

  const [activeTab, setActiveTab] = useState<ProjectScope>('yours');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProjects();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredProjects = projects.filter(
    p =>
      p.scope === activeTab &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject(name.trim(), description.trim(), instructions.trim());
    setName('');
    setDescription('');
    setInstructions('');
    setShowCreateModal(false);
  };

  const tabs: Array<{ id: ProjectScope; label: string }> = [
    { id: 'yours', label: t('projects.tabYours') },
    { id: 'power', label: t('projects.tabPower') },
    { id: 'shared', label: t('projects.tabShared') },
    { id: 'archived', label: t('projects.tabArchived') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        showBack
        title={t('projects.title')}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.newBtn, { backgroundColor: theme.primary }]}>
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.newBtnText}>{t('projects.newProject')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <SearchIcon size={18} color={theme.placeholderText} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder={t('projects.searchPlaceholder')}
            placeholderTextColor={theme.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Scope Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tabPill,
              activeTab === tab.id
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.buttonBackground },
            ]}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? '#FFFFFF' : theme.textSecondary },
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('projects.noProjects')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => selectProject(item.id)}
              style={[
                styles.projectCard,
                {
                  backgroundColor: theme.secondaryBackground,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: item.color || theme.primary },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.projectName, { color: theme.textPrimary }]}>
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.scopeBadge,
                    { backgroundColor: theme.pillBackground },
                  ]}>
                  <Text style={[styles.scopeText, { color: theme.tagText }]}>
                    {item.scope}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text
                  numberOfLines={2}
                  style={[styles.projectDesc, { color: theme.textSecondary }]}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={[styles.metaText, { color: theme.textMuted }]}>
                  {t('projects.knowledgeItemCount', {
                    count: item.knowledgeItems.length,
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Project Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.secondaryBackground,
                paddingBottom:
                  Platform.OS === 'android' && keyboardHeight > 0
                    ? keyboardHeight + 16
                    : Math.max(insets.bottom, 20),
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {t('projects.createModalTitle')}
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowCreateModal(false)}>
                <CloseIcon size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {t('projects.nameLabel')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t('projects.namePlaceholder')}
                placeholderTextColor={theme.placeholderText}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {t('projects.descriptionLabel')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t('projects.descriptionPlaceholder')}
                placeholderTextColor={theme.placeholderText}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {t('projects.instructionsLabel')}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.background,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t('projects.instructionsPlaceholder')}
                placeholderTextColor={theme.placeholderText}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Create project"
                accessibilityState={{ disabled: !name.trim() }}
                disabled={!name.trim()}
                onPress={handleCreate}
                style={[
                  styles.createBtn,
                  { backgroundColor: theme.primary },
                  !name.trim() && styles.createBtnDisabled,
                ]}>
                <Text style={styles.createBtnText}>{t('projects.createButton')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 6,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 10,
  },
  projectCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scopeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  projectDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  createBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
