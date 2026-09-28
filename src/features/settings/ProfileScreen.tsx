import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoutIcon } from '../../components/common/Icons';
import { ChatHeader } from '../chat/components/ChatHeader';
import { useApp } from '../../store/AppContext';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    theme,
    isDark,
    profile,
    updateSettings,
    setDrawerOpen,
    navigate,
    logout,
  } = useApp();

  const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

  const displayName = profile.name || 'iftakhar alam';
  const displayEmail = profile.email || 'iftakharalamshihad@gmail.com';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}>
      {/* 1:1 Header matching screenshot */}
      <ChatHeader
        theme={theme}
        isDark={isDark}
        onLeadingTap={() => setDrawerOpen(true)}
        onTerminalTap={() => navigate('code')}
        onThemeTap={() => updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Main Title */}
        <Text style={[styles.mainTitle, { color: theme.textPrimary, fontFamily: monoFont }]}>
          Account settings
        </Text>

        {/* Name Block */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: '#71767B', fontFamily: monoFont }]}>
            Name
          </Text>
          <Text style={[styles.fieldValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {displayName}
          </Text>
        </View>

        {/* Email Block */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: '#71767B', fontFamily: monoFont }]}>
            Email
          </Text>
          <Text style={[styles.fieldValue, { color: theme.textPrimary, fontFamily: monoFont }]}>
            {displayEmail}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('usage')}
            style={[styles.btn, { borderColor: '#2E322C', backgroundColor: '#161815' }]}>
            <Text style={[styles.btnText, { color: '#ECEEEC', fontFamily: monoFont }]}>
              View usage
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            style={[styles.btn, styles.signOutBtn, { borderColor: '#2E322C', backgroundColor: '#161815' }]}>
            <LogoutIcon size={16} color="#ECEEEC" />
            <Text style={[styles.btnText, { color: '#ECEEEC', fontFamily: monoFont }]}>
              Sign out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 8,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    gap: 6,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
