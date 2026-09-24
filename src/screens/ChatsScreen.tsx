import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../components/common/AppHeader';
import {
  CheckmarkIcon,
  CloseIcon,
  DeleteIcon,
  SearchIcon,
} from '../components/common/Icons';
import { useApp } from '../store/AppContext';
import { Conversation } from '../types';

export function ChatsScreen() {
  const {
    theme,
    conversations,
    selectConversation,
    deleteConversations,
    navigate,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter(x => x !== id);
      setSelectedIds(next);
      if (next.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleItemPress = (conv: Conversation) => {
    if (isSelectionMode) {
      toggleSelection(conv.id);
    } else {
      selectConversation(conv.id);
    }
  };

  const handleItemLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([id]);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete conversations?',
      `Are you sure you want to delete ${selectedIds.length} conversation${
        selectedIds.length > 1 ? 's' : ''
      }? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteConversations(selectedIds);
            setSelectedIds([]);
            setIsSelectionMode(false);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        showBack
        title={
          isSelectionMode
            ? `${selectedIds.length} selected`
            : 'Chats'
        }
        rightAction={
          isSelectionMode ? (
            <View style={styles.selectionActions}>
              <TouchableOpacity
                onPress={confirmDelete}
                style={[styles.deleteBtn, { backgroundColor: theme.buttonBackground }]}>
                <DeleteIcon size={18} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}
                style={[styles.deleteBtn, { backgroundColor: theme.buttonBackground }]}>
                <CloseIcon size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

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
            placeholder="Search Chats"
            placeholderTextColor={theme.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CloseIcon size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No conversations yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item.id)}
                style={[
                  styles.chatRow,
                  {
                    backgroundColor: theme.secondaryBackground,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}>
                {isSelectionMode && (
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? theme.primary : theme.outline,
                        backgroundColor: isSelected
                          ? theme.primary
                          : 'transparent',
                      },
                    ]}>
                    {isSelected && <CheckmarkIcon size={14} color="#FFFFFF" />}
                  </View>
                )}
                <View style={styles.chatInfo}>
                  <Text
                    numberOfLines={1}
                    style={[styles.chatTitle, { color: theme.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.chatDate, { color: theme.textMuted }]}>
                    {item.activityDate} • {item.model}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatDate: {
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
});
