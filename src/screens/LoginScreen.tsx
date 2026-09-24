import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PukuLogoBadge } from '../components/common/Icons';
import { useApp } from '../store/AppContext';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, navigate } = useApp();

  const handleSignIn = () => {
    navigate('chat');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Brand Header */}
        <View style={styles.header}>
          <PukuLogoBadge size={54} bg={theme.primary} />
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>
            Puku AI
          </Text>
        </View>

        {/* Hero typography */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroHeadline, { color: theme.textPrimary }]}>
            Intelligence{' '}
            <Text style={{ color: theme.primary, fontWeight: '800' }}>
              at your fingertips
            </Text>
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Next-generation autonomous coding, multimodal chat, voice intelligence, and
            desktop session relay built into one unified mobile experience.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          {/* Google Sign In CTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignIn}
            style={[styles.googleBtn, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Email Sign In */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignIn}
            style={[styles.emailBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.emailBtnText}>Continue with Email</Text>
          </TouchableOpacity>

          {/* Guest Access */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignIn}
            style={[styles.guestBtn, { backgroundColor: theme.buttonBackground }]}>
            <Text style={[styles.guestBtnText, { color: theme.tagText }]}>
              Explore as Guest
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal notice */}
        <Text style={[styles.legalText, { color: theme.textMuted }]}>
          By continuing, you agree to Puku AI's Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSection: {
    marginTop: 60,
    marginBottom: 40,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionsBox: {
    gap: 12,
    marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#151324',
  },
  emailBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
  },
  emailBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
