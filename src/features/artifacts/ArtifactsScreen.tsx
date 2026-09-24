import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/common/AppHeader';
import {
  CheckmarkIcon,
  CloseIcon,
  CopyIcon,
  SearchIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import { Artifact } from '../../types';

export function ArtifactsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, artifacts } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const filteredArtifacts = artifacts.filter(a => {
    const matchesSearch = a.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || a.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCopy = (content: string) => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const types = [
    { id: 'all', label: 'All' },
    { id: 'code', label: 'Code' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'svg', label: 'SVG' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader showBack title="Artifacts" />

      {/* Search Input */}
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
            placeholder="Search Artifacts"
            placeholderTextColor={theme.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Type Filter Pills */}
      <View style={styles.filtersRow}>
        {types.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setSelectedType(t.id)}
            style={[
              styles.filterPill,
              selectedType === t.id
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.buttonBackground },
            ]}>
            <Text
              style={[
                styles.filterText,
                { color: selectedType === t.id ? '#FFFFFF' : theme.textSecondary },
              ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Artifacts List */}
      {filteredArtifacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No artifacts yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredArtifacts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveArtifact(item)}
              style={[
                styles.artifactCard,
                {
                  backgroundColor: theme.secondaryBackground,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.cardHeader}>
                <Text
                  numberOfLines={1}
                  style={[styles.artifactTitle, { color: theme.textPrimary }]}>
                  {item.title}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: theme.pillBackground },
                  ]}>
                  <Text style={[styles.typeText, { color: theme.tagText }]}>
                    {item.type}
                  </Text>
                </View>
              </View>

              <Text
                numberOfLines={2}
                style={[
                  styles.previewText,
                  { color: theme.textSecondary, fontFamily: 'monospace' },
                ]}>
                {item.content}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.dateText, { color: theme.textMuted }]}>
                  Created {item.createdAt}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Artifact Viewer Modal */}
      <Modal
        visible={!!activeArtifact}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveArtifact(null)}>
        <TouchableWithoutFeedback onPress={() => setActiveArtifact(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {activeArtifact?.title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Type: {activeArtifact?.type} • Language: {activeArtifact?.language || 'plain'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActiveArtifact(null)}>
              <CloseIcon size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Code/Content box */}
          <ScrollView
            style={[
              styles.codeBox,
              { backgroundColor: theme.codeBackground, borderColor: theme.border },
            ]}>
            <Text
              style={[
                styles.codeText,
                { color: '#A5A5FF', fontFamily: 'monospace' },
              ]}>
              {activeArtifact?.content}
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => activeArtifact && handleCopy(activeArtifact.content)}
              style={[styles.copyBtn, { backgroundColor: theme.primary }]}>
              {isCopied ? (
                <CheckmarkIcon size={18} color="#FFFFFF" />
              ) : (
                <CopyIcon size={18} color="#FFFFFF" />
              )}
              <Text style={styles.copyBtnText}>
                {isCopied ? 'Copied to Clipboard' : 'Copy Content'}
              </Text>
            </TouchableOpacity>
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
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 10,
  },
  artifactCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  artifactTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dateText: {
    fontSize: 11,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  codeBox: {
    maxHeight: 280,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    marginTop: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
