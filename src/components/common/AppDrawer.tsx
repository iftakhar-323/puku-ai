import React from 'react';
import {
  Modal,
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
import {
  Avatar,
  AvatarFallback,
  Button,
  Sidebar,
  SidebarFooter,
  SidebarNavItem,
  SidebarNavTop,
  SidebarSessionGroup,
  SidebarSessionRow,
  SidebarSessions,
} from '../ui';

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
    refreshConversations,
  } = useApp();

  React.useEffect(() => {
    if (isDrawerOpen && conversations.length === 0) {
      refreshConversations().catch(() => {});
    }
  }, [isDrawerOpen, conversations.length, refreshConversations]);

  if (!isDrawerOpen) return null;

  const userInitial = profile.name
    ? profile.name[0].toUpperCase()
    : profile.email
    ? profile.email[0].toUpperCase()
    : '?';

  const recentConversations = conversations.filter(
    c => c.title?.toLowerCase() !== 'incognito' && !c.id.startsWith('incog_')
  );

  return (
    <Modal
      visible={isDrawerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setDrawerOpen(false)}>
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
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <Sidebar style={styles.sidebar}>
            {/* Header Brand */}
            <View style={styles.brandHeader}>
              <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>
                Puku
              </Text>
            </View>

            {/* Top Navigation */}
            <SidebarNavTop style={styles.navTop}>
              <SidebarNavItem
                icon={<MessageIcon size={20} color={theme.textPrimary} />}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('chats');
                }}>
                Chats
              </SidebarNavItem>

              <SidebarNavItem
                icon={<FolderLibraryIcon size={20} color={theme.textPrimary} />}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('projects');
                }}>
                Projects
              </SidebarNavItem>

              <SidebarNavItem
                icon={<ArtboardIcon size={20} color={theme.textPrimary} />}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('artifacts');
                }}>
                Artifacts
              </SidebarNavItem>

              <SidebarNavItem
                icon={<SourceCodeIcon size={20} color={theme.textPrimary} />}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('code');
                }}>
                Code
              </SidebarNavItem>
            </SidebarNavTop>

            {/* Sessions / Recents Section */}
            <SidebarSessions style={styles.sessions}>
              {recentConversations.length > 0 && (
                <SidebarSessionGroup label="RECENTS">
                  {recentConversations.slice(0, 25).map(conv => (
                    <SidebarSessionRow
                      key={conv.id}
                      iconVariant="diff"
                      active={conv.id === activeConversationId}
                      label={conv.title}
                      onPress={() => {
                        selectConversation(conv.id);
                        setDrawerOpen(false);
                        navigate('chat');
                      }}
                    />
                  ))}
                </SidebarSessionGroup>
              )}
            </SidebarSessions>

            {/* Sidebar Footer */}
            <SidebarFooter style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('settings');
                }}>
                <Avatar size={42}>
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
              </TouchableOpacity>

              <View style={styles.footerSpacer} />

              <Button
                variant="default"
                size="md"
                onPress={() => {
                  startNewChat();
                  setDrawerOpen(false);
                }}
                style={styles.newChatBtn}>
                <PlusIcon size={18} color="#000000" />
                <Text style={styles.newChatText}>New chat</Text>
              </Button>
            </SidebarFooter>
          </Sidebar>
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
    zIndex: 10,
    elevation: 16,
  },
  sidebar: {
    flex: 1,
  },
  brandHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  drawerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  navTop: {
    paddingHorizontal: 12,
    gap: 4,
  },
  sessions: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerSpacer: {
    flex: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  newChatText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});
