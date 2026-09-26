import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import {
  ArtboardIcon,
  FolderLibraryIcon,
  MessageIcon,
  PlusIcon,
  SourceCodeIcon,
} from './Icons';

export function AppDrawer() {
  const insets = useSafeAreaInsets();
  const {
    isDrawerOpen,
    setDrawerOpen,
    theme,
    conversations,
    activeConversationId,
    profile,
    navigate,
    selectConversation,
    startNewChat,
  } = useApp();

  if (!isDrawerOpen) return null;

  const userInitial = profile.name
    ? profile.name[0].toUpperCase()
    : profile.email
    ? profile.email[0].toUpperCase()
    : '?';

  return (
    <Modal visible={isDrawerOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Panel */}
        <View
          style={[
            styles.drawerContent,
            {
              backgroundColor: theme.background,
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>
              Puku
            </Text>

            {/* Menu Items */}
            <View style={styles.menuGroup}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('chats');
                }}
                style={styles.menuItem}>
                <MessageIcon size={22} color={theme.textPrimary} />
                <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>
                  Chats
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('projects');
                }}
                style={styles.menuItem}>
                <FolderLibraryIcon size={22} color={theme.textPrimary} />
                <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>
                  Projects
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('artifacts');
                }}
                style={styles.menuItem}>
                <ArtboardIcon size={22} color={theme.textPrimary} />
                <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>
                  Artifacts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('code');
                }}
                style={styles.menuItem}>
                <SourceCodeIcon size={22} color={theme.textPrimary} />
                <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>
                  Code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recents Section */}
            {conversations.length > 0 && (
              <View style={styles.recentsSection}>
                <Text style={[styles.recentsHeader, { color: theme.textMuted }]}>
                  RECENTS
                </Text>

                {conversations.slice(0, 20).map(conv => {
                  return (
                    <TouchableOpacity
                      key={conv.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        selectConversation(conv.id);
                        setDrawerOpen(false);
                      }}
                      style={styles.recentItem}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.recentText,
                          { color: theme.textPrimary },
                        ]}>
                        {conv.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Drawer Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDrawerOpen(false);
                navigate('settings');
              }}
              style={[styles.avatarBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                startNewChat();
                setDrawerOpen(false);
              }}
              style={styles.newChatBtn}>
              <PlusIcon size={20} color="#000000" />
              <Text style={styles.newChatText}>New chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerContent: {
    width: '84%',
    height: '100%',
    paddingHorizontal: 20,
    zIndex: 10,
    elevation: 16,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 16,
  },
  drawerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  menuGroup: {
    gap: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  recentsSection: {
    marginTop: 20,
  },
  recentsHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 16,
  },
  recentItem: {
    paddingVertical: 12,
  },
  recentText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  newChatText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
});
