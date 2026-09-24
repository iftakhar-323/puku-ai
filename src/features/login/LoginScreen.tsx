import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleIcon, PukuLogoIcon } from '../../components/common/Icons';
import { pukuApi } from '../../services/api';
import { useApp } from '../../store/AppContext';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, navigate, updateProfile } = useApp();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('developer@puku.sh');
  const [password, setPassword] = useState('puku123');
  const [authToken, setAuthToken] = useState('');

  const handleGoogleSignIn = () => {
    pukuApi.setAuthToken('puku_google_token_active');
    updateProfile({
      name: 'Google User',
      email: 'user@gmail.com',
      provider: 'google',
      plan: 'Power',
    });
    navigate('chat');
  };

  const handleEmailSubmit = () => {
    const finalToken = authToken.trim() || 'puku_session_token_' + Date.now();
    pukuApi.setAuthToken(finalToken);
    updateProfile({
      name: email.split('@')[0] || 'Puku Developer',
      email: email.trim(),
      provider: 'email',
      plan: 'Power',
    });
    navigate('chat');
  };

  const handleGuest = () => {
    navigate('chat');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 16),
        },
      ]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.header}>
          <PukuLogoIcon size={36} />
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
            Puku Editor
          </Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroHeadline, { color: theme.textPrimary }]}>
            The{' '}
            <Text style={{ color: theme.coolGrey }}>AI Code Editor</Text>
            {'\n'}That Understands{'\n'}Your Entire{'\n'}
            <Text style={{ color: theme.pumpkin }}>Codebase</Text>
          </Text>

          <Text style={[styles.heroSubtitle, { color: theme.coolGrey }]}>
            <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>
              Puku{' '}
            </Text>
            understands your entire codebase, predicts what needs to change
            next, and guides you through it so you can build faster without
            losing context.
          </Text>
        </View>

        {showEmailForm ? (
          /* Email & Password / Token Form */
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.outline,
              },
            ]}>
            <Text style={[styles.formTitle, { color: theme.textPrimary }]}>
              Sign In to Puku
            </Text>

            <Text style={[styles.inputLabel, { color: theme.coolGrey }]}>
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. developer@puku.sh"
              placeholderTextColor={theme.placeholderText}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.formInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.outline,
                  backgroundColor: theme.background,
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: theme.coolGrey }]}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password (e.g. puku123)"
              placeholderTextColor={theme.placeholderText}
              secureTextEntry
              style={[
                styles.formInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.outline,
                  backgroundColor: theme.background,
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: theme.coolGrey }]}>
              Puku Auth Token (Optional for cloud models)
            </Text>
            <TextInput
              value={authToken}
              onChangeText={setAuthToken}
              placeholder="Paste Bearer token from chat.puku.sh"
              placeholderTextColor={theme.placeholderText}
              autoCapitalize="none"
              style={[
                styles.formInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.outline,
                  backgroundColor: theme.background,
                },
              ]}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleEmailSubmit}
              style={[styles.submitBtn, { backgroundColor: theme.primaryLight }]}>
              <Text style={styles.submitBtnText}>Sign In & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowEmailForm(false)}
              style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: theme.coolGrey }]}>
                Back to options
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Google CTA Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              style={styles.googleBtn}>
              <GoogleIcon size={20} color="#000000" />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: theme.outline }]} />
              <Text style={[styles.orText, { color: theme.coolGrey }]}>OR</Text>
              <View style={[styles.orLine, { backgroundColor: theme.outline }]} />
            </View>

            {/* Email CTA Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEmailForm(true)}
              style={[styles.emailBtn, { borderColor: theme.outline }]}>
              <Text style={[styles.emailBtnText, { color: theme.textPrimary }]}>
                Continue with Email & Password
              </Text>
            </TouchableOpacity>

            {/* Guest / Direct Chat */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGuest}
              style={styles.guestBtn}>
              <Text style={[styles.guestBtnText, { color: theme.textPrimary }]}>
                Continue as Guest / Offline AI →
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Legal Links */}
        <View style={styles.legalBox}>
          <Text style={[styles.legalText, { color: theme.coolGrey }]}>
            By signing in, you agree to our{' '}
            <Text
              onPress={handleGuest}
              style={[styles.legalLink, { color: theme.textPrimary }]}>
              Terms
            </Text>
            ,{' '}
            <Text
              onPress={handleGuest}
              style={[styles.legalLink, { color: theme.textPrimary }]}>
              Usage Policy
            </Text>{' '}
            and{' '}
            <Text
              onPress={handleGuest}
              style={[styles.legalLink, { color: theme.textPrimary }]}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Illustration from Flutter */}
      <View style={styles.bottomIllustrationContainer}>
        <Image
          source={require('../../assets/images/login_screen_bottom.png')}
          style={styles.bottomImage}
          resizeMode="cover"
        />
        <View
          style={[
            styles.bottomFadeOverlay,
            {
              backgroundColor: theme.background,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroSection: {
    marginTop: 32,
    marginBottom: 28,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
  },
  googleBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 16,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emailBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(107, 107, 142, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  guestBtn: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginVertical: 10,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  legalBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  bottomIllustrationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
    zIndex: 1,
    opacity: 0.85,
  },
  bottomImage: {
    width: '100%',
    height: '100%',
  },
  bottomFadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.9,
  },
});
