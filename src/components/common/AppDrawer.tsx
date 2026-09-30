import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import {
  ArchiveBoxIcon,
  BotIcon,
  ChatBubbleOutlineIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  CloseIcon,
  DownloadIcon,
  FolderSmallIcon,
  HelpCircleIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  PukuBotGradientIcon,
  PukuLogoIcon,
  SearchIcon,
  SettingsIcon,
  SlidersIcon,
  SortIcon,
  ThreeDotsHorizontalIcon,
  TrashIcon,
} from './Icons';

export function AppDrawer() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const {
    isDrawerOpen,
    setDrawerOpen,
    theme,
    isDark,
    activeRoute,
    conversations,
    activeConversationId,
    profile,
    navigate,
    selectConversation,
    startNewChat,
    deleteConversations,
    refreshConversations,
    botConversations,
    activeBotConversationId,
    activeBotId,
    availableBots,
    selectBotConversation,
    createBotConversation,
    deleteBotConversation,
    renameBotConversation,
    selectBot,
  } = useApp();

  const isBotMode = activeRoute === 'pukuBot';

  // Bot-specific drawer state
  const [botSearchQuery, setBotSearchQuery] = useState('');
  const [isBotDropdownOpen, setIsBotDropdownOpen] = useState(false);
  const [activeMenuBotConvId, setActiveMenuBotConvId] = useState<string | null>(null);

  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [isProjectsDropdownOpen, setIsProjectsDropdownOpen] = useState(false);
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isDrawerOpen && conversations.length === 0) {
      refreshConversations().catch(() => {});
    }
  }, [isDrawerOpen, conversations.length, refreshConversations]);

  if (!isDrawerOpen) return null;

  // Filter conversations for main drawer
  const filteredConversations = conversations.filter(c => {
    return Boolean(c.title && !c.id.startsWith('incog_'));
  });

  const searchedConversations = conversations.filter(c => {
    if (!c.title || c.id.startsWith('incog_')) return false;
    if (!findQuery.trim()) return true;
    return c.title.toLowerCase().includes(findQuery.toLowerCase());
  });

  const displayName = profile.name || 'iftakhar alam';

  const handleDelete = (id: string) => {
    deleteConversations([id]);
    setActiveMenuConvId(null);
  };

  const filteredBotConversations = (botConversations || []).filter(c => {
    if (!c.title) return false;
    if (!botSearchQuery.trim()) return true;
    return c.title.toLowerCase().includes(botSearchQuery.toLowerCase());
  });

  const currentBot =
    (availableBots || []).find(b => b.id === activeBotId) ||
    (availableBots && availableBots[0]) || {
      id: 'general-assistant',
      name: 'General Assistant',
      description: 'Autonomous agent',
    };

  const handleDeleteBot = (id: string) => {
    deleteBotConversation(id);
    setActiveMenuBotConvId(null);
  };

  const handleRenameBot = (id: string, currentTitle: string) => {
    Alert.prompt
      ? Alert.prompt(
          'Rename bot chat',
          'Enter new name:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save',
              onPress: newName => {
                if (newName?.trim()) {
                  renameBotConversation(id, newName.trim());
                  setActiveMenuBotConvId(null);
                }
              },
            },
          ],
          'plain-text',
          currentTitle
        )
      : Alert.alert('Rename', `Renamed chat "${currentTitle}"`);
    setActiveMenuBotConvId(null);
  };

  const handleRename = (id: string, currentTitle: string) => {
    Alert.prompt
      ? Alert.prompt(
          'Rename conversation',
          'Enter new name:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save',
              onPress: newName => {
                if (newName?.trim()) {
                  const conv = conversations.find(c => c.id === id);
                  if (conv) conv.title = newName.trim();
                  setActiveMenuConvId(null);
                }
              },
            },
          ],
          'plain-text',
          currentTitle
        )
      : Alert.alert('Rename', `Renamed conversation "${currentTitle}"`);
    setActiveMenuConvId(null);
  };

  return (
    <Modal
      visible={isDrawerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setIsProjectsDropdownOpen(false);
        setActiveMenuConvId(null);
        setDrawerOpen(false);
      }}>
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={() => {
            setIsProjectsDropdownOpen(false);
            setActiveMenuConvId(null);
            setDrawerOpen(false);
          }}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Panel (1:1 with screenshots 1, 2, 3) */}
        <View
          style={[
            styles.drawerContent,
            {
              backgroundColor: theme.secondaryBackground,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}>
          {isBotMode ? (
            /* ============================================================== */
            /* PUKU BOT DEDICATED DRAWER WORLD ("Alada Dunia")                 */
            /* ============================================================== */
            <>
              {/* Header Row: Bot Icon + 'Puku Bot' + Close (X) */}
              <View style={styles.drawerHeader}>
                <View style={styles.brandRow}>
                  <BotIcon size={22} color={isDark ? '#35D6B4' : theme.textPrimary} />
                  <Text style={[styles.brandText, { color: theme.textPrimary }]}>Puku Bot</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDrawerOpen(false)}
                  style={styles.closeBtn}>
                  <CloseIcon size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Bot Switcher Row (Select Active Bot Agent) */}
              <View style={styles.projectsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsBotDropdownOpen(prev => !prev)}
                  style={[styles.allProjectsBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <BotIcon size={16} color={isDark ? '#35D6B4' : theme.textPrimary} />
                  <Text numberOfLines={1} style={[styles.allProjectsText, { color: theme.textPrimary }]}>
                    {currentBot.name}
                  </Text>
                  <ChevronDownIcon size={12} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigate('pukuBot');
                  }}
                  style={[styles.squareIconBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <SettingsIcon size={16} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Bot Dropdown Menu */}
              {isBotDropdownOpen && (
                <View style={[styles.projectsDropdownCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  {(availableBots || []).map(b => {
                    const isSelected = b.id === currentBot.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          selectBot(b.id);
                          setIsBotDropdownOpen(false);
                        }}
                        style={styles.dropdownItemRow}>
                        {isSelected ? (
                          <CheckmarkIcon size={14} color={isDark ? '#35D6B4' : theme.textPrimary} />
                        ) : (
                          <View style={styles.dropdownCheckPlaceholder} />
                        )}
                        <View style={styles.dropdownItemContent}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              { color: theme.textPrimary },
                              isSelected ? styles.weight600 : styles.weight400,
                            ]}>
                            {b.name}
                          </Text>
                          {b.description ? (
                            <Text style={[styles.dropdownItemDesc, { color: theme.textMuted }]}>
                              {b.description}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Search & New Bot Chat Row */}
              <View style={styles.searchRow}>
                <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <SearchIcon size={16} color={theme.textSecondary} />
                  <TextInput
                    value={botSearchQuery}
                    onChangeText={setBotSearchQuery}
                    placeholder="Search bot chats"
                    placeholderTextColor={theme.placeholderText}
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                  />
                  {botSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBotSearchQuery('')}>
                      <CloseIcon size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    createBotConversation(activeBotId);
                    setDrawerOpen(false);
                    navigate('pukuBot');
                  }}
                  style={[styles.squareIconBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <PlusIcon size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Recent Section Header */}
              <View style={styles.recentSectionHeader}>
                <Text style={[styles.recentHeaderText, { color: theme.textPrimary }]}>
                  Recent Bot Chats
                </Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <SortIcon size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Scrollable Bot Conversations */}
              <ScrollView
                style={styles.conversationsScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {filteredBotConversations.length === 0 ? (
                  <View style={styles.botEmptyWrap}>
                    <Text style={[styles.botEmptyText, { color: theme.textMuted }]}>
                      {botSearchQuery ? 'No matching bot chats' : 'No bot chats yet.\nTap + above to start a session.'}
                    </Text>
                  </View>
                ) : (
                  filteredBotConversations.map(conv => {
                    const isActive = conv.id === activeBotConversationId;
                    return (
                      <View key={conv.id} style={styles.convRowWrapper}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            selectBotConversation(conv.id);
                            setDrawerOpen(false);
                            navigate('pukuBot');
                          }}
                          style={[
                            styles.convItem,
                            isActive && { backgroundColor: theme.pillBackground },
                          ]}>
                          <BotIcon size={15} color={isActive ? (isDark ? '#35D6B4' : theme.textPrimary) : theme.textSecondary} />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.convTitle,
                              { color: theme.textPrimary },
                              isActive ? styles.weight600 : styles.weight400,
                            ]}>
                            {conv.title || 'Bot Session'}
                          </Text>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() =>
                              setActiveMenuBotConvId(prev => (prev === conv.id ? null : conv.id))
                            }
                            style={styles.dotsBtn}>
                            <ThreeDotsHorizontalIcon size={16} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {/* Context Menu Popup */}
                        {activeMenuBotConvId === conv.id && (
                          <View
                            style={[
                              styles.contextMenuCard,
                              { backgroundColor: theme.cardBackground, borderColor: theme.border },
                            ]}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleRenameBot(conv.id, conv.title)}
                              style={styles.contextMenuItem}>
                              <PencilIcon size={14} color={theme.textPrimary} />
                              <Text style={[styles.contextMenuText, { color: theme.textPrimary }]}>
                                Rename
                              </Text>
                            </TouchableOpacity>

                            <View style={[styles.contextDivider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleDeleteBot(conv.id)}
                              style={styles.contextMenuItem}>
                              <TrashIcon size={14} color="#FF6B6B" />
                              <Text style={[styles.contextMenuText, styles.deleteText]}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Bot Footer: Switcher to Puku AI Chat + User */}
              <View style={styles.footerSection}>
                <View style={[styles.horizontalDivider, { backgroundColor: theme.border }]} />

                {/* Switch to Puku AI Chat Card */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigate('chat');
                  }}
                  style={[
                    styles.switchHubCard,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={styles.switchHubLeft}>
                    <PukuLogoIcon size={18} />
                    <View style={styles.switchHubTextWrap}>
                      <Text style={[styles.switchHubTitle, { color: theme.textPrimary }]}>
                        Switch to Puku AI
                      </Text>
                      <Text style={[styles.switchHubSub, { color: theme.textMuted }]}>
                        General chat & workspaces
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* User Profile Card */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigate('settings');
                  }}
                  style={styles.userProfileCard}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {displayName.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.userNameText, { color: theme.textPrimary }]}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
          {/* Header Row: Logo + 'Puku Chat' + Close (X) */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <PukuLogoIcon size={24} />
              <Text style={[styles.brandText, { color: theme.textPrimary }]}>Puku AI</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDrawerOpen(false)}
              style={styles.closeBtn}>
              <CloseIcon size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Projects Selector Row */}
          <View style={styles.projectsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsProjectsDropdownOpen(prev => !prev)}
              style={[styles.allProjectsBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <FolderSmallIcon size={16} color={theme.textPrimary} />
              <Text style={[styles.allProjectsText, { color: theme.textPrimary }]}>
                All projects
              </Text>
              <ChevronDownIcon size={12} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDrawerOpen(false);
                navigate('projects');
              }}
              style={[styles.squareIconBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <ArchiveBoxIcon size={16} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Projects Dropdown Menu (Screenshot 3) */}
          {isProjectsDropdownOpen && (
            <View style={[styles.projectsDropdownCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsProjectsDropdownOpen(false)}
                style={styles.dropdownItemRow}>
                <CheckmarkIcon size={14} color={theme.textPrimary} />
                <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                  All projects
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setIsProjectsDropdownOpen(false);
                  setDrawerOpen(false);
                  navigate('projects');
                }}
                style={styles.dropdownItemRow}>
                <PlusIcon size={14} color={theme.textPrimary} />
                <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                  New project
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search & New Chat Row */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setFindQuery('');
                setIsFindModalOpen(true);
              }}
              style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <SearchIcon size={16} color={theme.textSecondary} />
              <Text style={[styles.searchInputPlaceholder, { color: theme.placeholderText }]}>
                Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                startNewChat();
                setDrawerOpen(false);
                navigate('chat');
              }}
              style={[styles.squareIconBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <PlusIcon size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Recent Section Header */}
          <View style={styles.recentSectionHeader}>
            <Text style={[styles.recentHeaderText, { color: theme.textPrimary }]}>
              Recent
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <SortIcon size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Conversation List */}
          <ScrollView
            style={styles.conversationsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              return (
                <View key={conv.id} style={styles.convRowWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      selectConversation(conv.id);
                      setDrawerOpen(false);
                      navigate('chat');
                    }}
                    style={[
                      styles.convItem,
                      isActive && { backgroundColor: theme.pillBackground },
                    ]}>
                    <ChatBubbleOutlineIcon size={15} color={isActive ? theme.textPrimary : theme.textSecondary} />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.convTitle,
                        { color: theme.textPrimary },
                        isActive ? styles.weight600 : styles.weight400,
                      ]}>
                      {conv.title || 'Untitled conversation'}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setActiveMenuConvId(prev => (prev === conv.id ? null : conv.id))
                      }
                      style={styles.dotsBtn}>
                      <ThreeDotsHorizontalIcon size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Context Menu Popup */}
                  {activeMenuConvId === conv.id && (
                    <View
                      style={[
                        styles.contextMenuCard,
                        { backgroundColor: theme.cardBackground, borderColor: theme.border },
                      ]}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleRename(conv.id, conv.title)}
                        style={styles.contextMenuItem}>
                        <PencilIcon size={14} color={theme.textPrimary} />
                        <Text style={[styles.contextMenuText, { color: theme.textPrimary }]}>
                          Rename
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setActiveMenuConvId(null)}
                        style={styles.contextMenuItem}>
                        <PinIcon size={14} color={theme.textPrimary} />
                        <Text style={[styles.contextMenuText, { color: theme.textPrimary }]}>
                          Pin
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setActiveMenuConvId(null);
                          navigate('projects');
                        }}
                        style={styles.contextMenuItem}>
                        <FolderSmallIcon size={14} color={theme.textPrimary} />
                        <Text style={[styles.contextMenuText, { color: theme.textPrimary }]}>
                          Move to project
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setActiveMenuConvId(null)}
                        style={styles.contextMenuItem}>
                        <ArchiveBoxIcon size={14} color={theme.textPrimary} />
                        <Text style={[styles.contextMenuText, { color: theme.textPrimary }]}>
                          Archive
                        </Text>
                      </TouchableOpacity>

                      <View style={[styles.contextDivider, { backgroundColor: theme.border }]} />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDelete(conv.id)}
                        style={styles.contextMenuItem}>
                        <TrashIcon size={14} color="#FF6B6B" />
                        <Text style={[styles.contextMenuText, styles.deleteText]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom Footer Section */}
          <View style={styles.footerSection}>
            <View style={[styles.horizontalDivider, { backgroundColor: theme.border }]} />

            {/* Switch to Puku Bot Hub Card */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                selectBotConversation(null as any);
                setDrawerOpen(false);
                navigate('pukuBot');
              }}
              style={[
                styles.switchHubCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.switchHubLeft}>
                <PukuBotGradientIcon size={20} />
                <View style={styles.switchHubTextWrap}>
                  <Text style={[styles.switchHubTitle, { color: theme.textPrimary }]}>
                    Switch to Puku Bot
                  </Text>
                  <Text style={[styles.switchHubSub, { color: theme.textMuted }]}>
                    Autonomous computer & laptop agent
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Actions: Customize, Download, Help */}
            <View style={styles.bottomActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('settings');
                }}
                style={styles.customizeBtn}>
                <SlidersIcon size={16} color={theme.textPrimary} />
                <Text style={[styles.customizeText, { color: theme.textPrimary }]}>
                  Customize
                </Text>
              </TouchableOpacity>

              <View style={styles.rightActionIcons}>
                <TouchableOpacity activeOpacity={0.7} style={styles.footerIconBtn}>
                  <DownloadIcon size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.footerIconBtn}>
                  <HelpCircleIcon size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* User Profile Card */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDrawerOpen(false);
                navigate('settings');
              }}
              style={styles.userProfileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {displayName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.userNameText, { color: theme.textPrimary }]}>
                {displayName}
              </Text>
            </TouchableOpacity>

            {/* Power Plan Meter */}
            <View style={styles.powerMeterRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setDrawerOpen(false);
                  navigate('usage');
                }}
                style={[
                  styles.powerBtn,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}>
                <Text style={[styles.powerBtnText, { color: theme.textPrimary }]}>
                  Power
                </Text>
              </TouchableOpacity>
              <View style={[styles.powerTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.powerFill, { backgroundColor: theme.textMuted }]} />
              </View>
            </View>
          </View>
            </>
          )}
        </View>
      </View>

      {/* 1:1 Find a conversation overlay matching media_1790585790051.png */}
      {isFindModalOpen && (
        <View style={styles.findModalOverlay}>
          <View
            style={[
              styles.findModalBackdrop,
              Platform.OS === 'android' && keyboardHeight > 0
                ? [styles.androidKeyboardOffset, { paddingBottom: keyboardHeight + 20 }]
                : null,
            ]}>
            <TouchableWithoutFeedback onPress={() => setIsFindModalOpen(false)}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>

            <View
              style={[
                styles.findModalCard,
                {
                  backgroundColor: theme.cardBackground || '#FFFFFF',
                  borderColor: theme.border,
                },
              ]}>
              {/* Header: Title + Close (X) */}
              <View style={styles.findModalHeader}>
                <Text
                  style={[
                    styles.findModalTitle,
                    { color: theme.textPrimary },
                  ]}>
                  Find a conversation
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsFindModalOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.findCloseBtn}>
                  <CloseIcon size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Indigo Outlined Search Input Box */}
              <View
                style={[
                  styles.findInputWrapper,
                  { backgroundColor: theme.secondaryBackground },
                ]}>
                <SearchIcon size={16} color={theme.textMuted} />
                <TextInput
                  value={findQuery}
                  onChangeText={setFindQuery}
                  placeholder="Search your thoughts..."
                  placeholderTextColor={theme.placeholderText}
                  autoFocus
                  style={[
                    styles.findInputField,
                    { color: theme.textPrimary },
                  ]}
                />
              </View>

              {/* Conversation List */}
              <ScrollView
                style={styles.findListScroll}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled">
                {searchedConversations.length === 0 ? (
                  <View style={styles.findEmptyWrap}>
                    <Text
                      style={[
                        styles.findEmptyText,
                        { color: theme.textMuted },
                      ]}>
                      No thoughts found
                    </Text>
                  </View>
                ) : (
                  searchedConversations.map(conv => (
                    <TouchableOpacity
                      key={conv.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        selectConversation(conv.id);
                        setIsFindModalOpen(false);
                        setDrawerOpen(false);
                        navigate('chat');
                      }}
                      style={styles.findItemRow}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.findItemText,
                          { color: theme.textPrimary },
                        ]}>
                        {conv.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  drawerContent: {
    width: '84%',
    height: '100%',
    zIndex: 10,
    elevation: 20,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    fontFamily: monoFont,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  allProjectsBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  allProjectsText: {
    fontFamily: monoFont,
    flex: 1,
    fontSize: 13,
  },
  squareIconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectsDropdownCard: {
    position: 'absolute',
    top: 108,
    left: 16,
    right: 64,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 999,
    elevation: 15,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontFamily: monoFont,
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    fontFamily: monoFont,
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  recentHeaderText: {
    fontFamily: monoFont,
    fontSize: 12,
  },
  conversationsScroll: {
    flex: 1,
  },
  convRowWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 10,
    borderRadius: 8,
  },
  convTitle: {
    fontFamily: monoFont,
    flex: 1,
    fontSize: 13,
  },
  dotsBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextMenuCard: {
    position: 'absolute',
    top: 36,
    right: 12,
    width: 170,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  contextMenuText: {
    fontFamily: monoFont,
    fontSize: 13,
  },
  contextDivider: {
    height: 1,
    marginVertical: 4,
  },
  footerSection: {
    paddingTop: 10,
  },
  horizontalDivider: {
    height: 1,
    width: '100%',
    marginBottom: 14,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 0,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customizeText: {
    fontFamily: monoFont,
    fontSize: 13,
  },
  rightActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerIconBtn: {
    padding: 2,
  },
  switchHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  switchHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchHubTitle: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '600',
  },
  switchHubSub: {
    fontFamily: monoFont,
    fontSize: 11,
    marginTop: 2,
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3f3a86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  userNameText: {
    fontFamily: monoFont,
    fontSize: 14,
  },
  powerMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 0,
  },
  powerBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  powerBtnText: {
    fontFamily: monoFont,
    fontSize: 12,
  },
  powerTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  powerFill: {
    width: '40%',
    height: '100%',
  },
  searchInputPlaceholder: {
    fontFamily: monoFont,
    fontSize: 14,
    lineHeight: 20,
  },
  findModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  findModalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '75%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  findModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  findModalTitle: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '700',
  },
  findCloseBtn: {
    padding: 4,
  },
  findInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4A54E8',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
    marginBottom: 14,
  },
  findInputField: {
    fontFamily: monoFont,
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  findListScroll: {
    maxHeight: 320,
  },
  findItemRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  findItemText: {
    fontFamily: monoFont,
    fontSize: 14,
    lineHeight: 20,
  },
  findEmptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  findEmptyText: {
    fontFamily: monoFont,
    fontSize: 13,
  },
  dropdownCheckPlaceholder: {
    width: 14,
  },
  dropdownItemContent: {
    marginLeft: 8,
    flex: 1,
  },
  dropdownItemDesc: {
    fontFamily: monoFont,
    fontSize: 11,
    marginTop: 2,
  },
  botEmptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  botEmptyText: {
    fontFamily: monoFont,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  convItemActive: {
    borderRadius: 8,
  },
  weight600: {
    fontWeight: '600',
  },
  weight400: {
    fontWeight: '400',
  },
  deleteText: {
    color: '#FF6B6B',
  },
  switchHubTextWrap: {
    marginLeft: 10,
  },
  findModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  androidKeyboardOffset: {
    justifyContent: 'flex-end',
  },
});
