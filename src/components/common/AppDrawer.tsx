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
  ArtifactsIcon,
  ChatsIcon,
  CloseIcon,
  CodeIcon,
  LiveVoiceIcon,
  PlusIcon,
  ProjectsIcon,
  PukuLogoBadge,
  RemoteIcon,
  SettingsIcon,
  TranscribeIcon,
} from './Icons';

export function AppDrawer() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    isDrawerOpen,
    setDrawerOpen,
    navigate,
    conversations,
    selectConversation,
    startNewChat,
    profile,
  } = useApp();

  if (!isDrawerOpen) return null;

  const avatarInitial = profile.name ? profile.name[0].toUpperCase() : 'P';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isDrawerOpen}
      onRequestClose={() => setDrawerOpen(false)}>
      <View style={styles.overlay}>
        {/* Backdrop touchable */}
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer container */}
        <View
          style={[
            styles.drawerContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <PukuLogoBadge size={38} bg={theme.primary} />
              <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>
                Puku
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDrawerOpen(false)}
              style={[styles.closeButton, { backgroundColor: theme.buttonBackground }]}>
              <CloseIcon size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}>
            <View style={styles.navGroup}>
              <DrawerNavRow
                icon={<ChatsIcon size={22} color={theme.primary} />}
                label="Chats"
                onPress={() => navigate('chats')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<ProjectsIcon size={22} color={theme.primary} />}
                label="Projects"
                onPress={() => navigate('projects')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<ArtifactsIcon size={22} color={theme.primary} />}
                label="Artifacts"
                onPress={() => navigate('artifacts')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<CodeIcon size={22} color={theme.primary} />}
                label="Code Sessions"
                onPress={() => navigate('code')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<RemoteIcon size={22} color={theme.primary} />}
                label="Remote Session"
                onPress={() => navigate('remoteSession')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<TranscribeIcon size={22} color={theme.primary} />}
                label="Transcribe"
                onPress={() => navigate('transcribe')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<LiveVoiceIcon size={22} color={theme.primary} />}
                label="Live Voice"
                onPress={() => navigate('liveVoice')}
                textColor={theme.textPrimary}
              />
              <DrawerNavRow
                icon={<SettingsIcon size={22} color={theme.primary} />}
                label="Settings"
                onPress={() => navigate('settings')}
                textColor={theme.textPrimary}
              />
            </View>

            {/* Recents list */}
            {conversations.length > 0 && (
              <View style={styles.recentsSection}>
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                  RECENTS
                </Text>
                {conversations.slice(0, 8).map(conv => (
                  <TouchableOpacity
                    key={conv.id}
                    onPress={() => {
                      selectConversation(conv.id);
                      setDrawerOpen(false);
                    }}
                    style={styles.recentItem}>
                    <Text
                      numberOfLines={1}
                      style={[styles.recentText, { color: theme.textSecondary }]}>
                      {conv.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => navigate('profile')}
              style={[styles.avatarButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => startNewChat()}
              style={[
                styles.newChatButton,
                { backgroundColor: theme.pillBackground },
              ]}>
              <PlusIcon size={16} color={theme.tagText} />
              <Text style={[styles.newChatText, { color: theme.tagText }]}>
                New chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DrawerNavRow({
  icon,
  label,
  onPress,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  textColor: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.navRow}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.navLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  drawerContent: {
    width: '82%',
    maxWidth: 340,
    height: '100%',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  navGroup: {
    paddingVertical: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 14,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentsSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  recentItem: {
    paddingVertical: 9,
  },
  recentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 8,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
