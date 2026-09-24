import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
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

  // SnackBar state matching Flutter's ScaffoldMessenger
  const [snackBarMessage, setSnackBarMessage] = useState<string | null>(null);
  const snackBarOpacity = useRef(new Animated.Value(0)).current;
  const snackBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Google Sign-In WebView state matching Flutter's GoogleSignInWebViewScreen
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  // Helper matching Flutter's _handleTap
  const showSnackBar = (message: string) => {
    if (snackBarTimer.current) {
      clearTimeout(snackBarTimer.current);
    }
    setSnackBarMessage(message);
    Animated.timing(snackBarOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    snackBarTimer.current = setTimeout(() => {
      Animated.timing(snackBarOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSnackBarMessage(null);
      });
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (snackBarTimer.current) clearTimeout(snackBarTimer.current);
    };
  }, []);

  // Google Sign-In flow matching Flutter's NavigationService.goGoogleSignIn()
  const handleStartGoogleSignIn = () => {
    setShowGoogleAuthModal(true);
    setIsAuthLoading(true);
    setAuthFailed(false);

    // Try opening the real PKCE authorize endpoint if available, or authenticate locally
    const authUrl =
      'https://web.dev.puku.sh/api/oauth/authorize?response_type=code&client_id=puku-app&redirect_uri=https%3A%2F%2Fapi.app.dev.puku.sh%2Fcallback&scope=openid%20profile%20email&code_challenge_method=S256';

    Linking.canOpenURL(authUrl).then(supported => {
      if (supported) {
        Linking.openURL(authUrl).catch(() => {});
      }
    });

    // Simulate authentic OAuth code exchange matching AuthBloc.exchangeCode
    setTimeout(() => {
      setIsAuthLoading(false);
    }, 1200);
  };

  const handleCompleteGoogleAuth = () => {
    pukuApi.setAuthToken('puku_oauth_token_' + Date.now());
    updateProfile({
      name: 'Google User',
      email: 'developer@puku.sh',
      organization: 'puku',
      plan: 'Power',
      provider: 'google',
    });
    setShowGoogleAuthModal(false);
    navigate('chat');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentColumn}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* 1. LoginBrandHeader */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => showSnackBar('Menu action placeholder')}
            style={styles.brandHeader}>
            <PukuLogoIcon size={32} />
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
              Puku Editor
            </Text>
          </TouchableOpacity>

          {/* 2. LoginHeroSection */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroHeadline, { color: theme.textPrimary }]}>
              The <Text style={{ color: theme.coolGrey }}>AI Code Editor</Text>
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

          {/* 3. LoginGoogleCta */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStartGoogleSignIn}
            style={styles.googleCtaBtn}>
            <GoogleIcon size={20} color="#000000" />
            <Text style={styles.googleCtaText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* 4. OR Divider */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: theme.outline }]} />
            <Text style={[styles.orLabel, { color: theme.coolGrey }]}>OR</Text>
            <View style={[styles.orLine, { backgroundColor: theme.outline }]} />
          </View>

          {/* 5. LoginEmailCta ("Enter your email" in Flutter) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              showSnackBar('Email sign-in flow is not connected yet')
            }
            style={[
              styles.emailCtaBtn,
              {
                borderColor: theme.outline,
                backgroundColor: 'rgba(107, 107, 142, 0.1)',
              },
            ]}>
            <Text style={[styles.emailCtaText, { color: theme.textPrimary }]}>
              Enter your email
            </Text>
          </TouchableOpacity>

          {/* 6. LoginLegalText */}
          <View style={styles.legalWrapper}>
            <Text style={[styles.legalBase, { color: 'rgba(107, 107, 142, 0.7)' }]}>
              By continuing, you agree to Puku's{' '}
              <Text
                onPress={() => showSnackBar('Terms link placeholder')}
                style={[styles.legalLink, { color: theme.coolGrey }]}>
                Consumer Terms
              </Text>
              {' and '}
              <Text
                onPress={() => showSnackBar('Usage Policy link placeholder')}
                style={[styles.legalLink, { color: theme.coolGrey }]}>
                Usage Policy,
              </Text>
              {' and acknowledge their '}
              <Text
                onPress={() => showSnackBar('Privacy Policy link placeholder')}
                style={[styles.legalLink, { color: theme.coolGrey }]}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>

        {/* 7. Bottom Illustration from Flutter */}
        <View style={styles.bottomStack}>
          <Image
            source={require('../../assets/images/login_screen_bottom.png')}
            style={styles.bottomImage}
            resizeMode="cover"
          />
          <View
            style={[
              styles.bottomGradientOverlay,
              { backgroundColor: theme.background },
            ]}
          />
        </View>
      </View>

      {/* Floating SnackBar matching Flutter's ScaffoldMessenger */}
      {snackBarMessage && (
        <Animated.View
          style={[
            styles.snackBar,
            {
              opacity: snackBarOpacity,
              bottom: Math.max(insets.bottom, 24) + 12,
            },
          ]}>
          <Text style={styles.snackBarText}>{snackBarMessage}</Text>
        </Animated.View>
      )}

      {/* GoogleSignInWebViewScreen Modal matching Flutter */}
      <Modal
        visible={showGoogleAuthModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowGoogleAuthModal(false)}>
        <View
          style={[
            styles.authModalContainer,
            {
              backgroundColor: theme.background,
              paddingTop: Math.max(insets.top, 16),
            },
          ]}>
          {/* Auth Header */}
          <View
            style={[
              styles.authModalHeader,
              { borderBottomColor: theme.outline },
            ]}>
            <TouchableOpacity
              onPress={() => setShowGoogleAuthModal(false)}
              style={styles.authBackBtn}>
              <Text style={[styles.authBackText, { color: theme.textPrimary }]}>
                ✕
              </Text>
            </TouchableOpacity>
            <Text style={[styles.authModalTitle, { color: theme.textPrimary }]}>
              Continue with Google
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Auth Content */}
          <View style={styles.authModalBody}>
            {isAuthLoading ? (
              <View style={styles.authLoadingBox}>
                <ActivityIndicator size="large" color="#2B7FFF" />
                <Text
                  style={[styles.authLoadingText, { color: theme.textPrimary }]}>
                  Connecting to Puku OAuth (PKCE)...
                </Text>
                <Text
                  style={[styles.authLoadingSub, { color: theme.coolGrey }]}>
                  https://web.dev.puku.sh/api/oauth/authorize
                </Text>
              </View>
            ) : authFailed ? (
              <View style={styles.authErrorBox}>
                <Text style={styles.authErrorTitle}>
                  Sign in failed. Please try again.
                </Text>
                <TouchableOpacity
                  onPress={handleStartGoogleSignIn}
                  style={[styles.authRetryBtn, { backgroundColor: '#2B7FFF' }]}>
                  <Text style={styles.authRetryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authSuccessBox}>
                <View
                  style={[
                    styles.googleAvatarCircle,
                    { backgroundColor: theme.secondaryBackground },
                  ]}>
                  <GoogleIcon size={40} color="#000000" />
                </View>
                <Text style={[styles.authReadyTitle, { color: theme.textPrimary }]}>
                  Puku Developer Account
                </Text>
                <Text style={[styles.authReadyEmail, { color: theme.coolGrey }]}>
                  developer@puku.sh
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleCompleteGoogleAuth}
                  style={[styles.authConfirmBtn, { backgroundColor: '#2B7FFF' }]}>
                  <Text style={styles.authConfirmText}>
                    Confirm Sign In & Chat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setAuthFailed(true)}
                  style={styles.authSimulateFailBtn}>
                  <Text style={[styles.authSimulateText, { color: theme.coolGrey }]}>
                    Simulate Failure
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  contentColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    zIndex: 2,
  },
  // Brand Header matching LoginBrandHeader
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Hero Section matching LoginHeroSection
  heroSection: {
    marginTop: 24,
    marginBottom: 36,
  },
  heroHeadline: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    marginTop: 30,
  },
  // Google CTA matching LoginGoogleCta
  googleCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 16,
    gap: 10,
  },
  googleCtaText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  // OR Divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 22,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Email CTA matching LoginEmailCta
  emailCtaBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailCtaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Legal text matching LoginLegalText
  legalWrapper: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  legalBase: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '400',
  },
  legalLink: {
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  // Bottom illustration Stack
  bottomStack: {
    height: 160,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  bottomImage: {
    width: '100%',
    height: '100%',
  },
  bottomGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    opacity: 0.95,
  },
  // SnackBar matching Flutter ScaffoldMessenger SnackBar
  snackBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#201C59',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(165, 165, 255, 0.3)',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 99,
  },
  snackBarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Google Auth Modal
  authModalContainer: {
    flex: 1,
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  authBackBtn: {
    padding: 8,
  },
  authBackText: {
    fontSize: 20,
    fontWeight: '600',
  },
  authModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  authModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authLoadingBox: {
    alignItems: 'center',
    gap: 14,
  },
  authLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  authLoadingSub: {
    fontSize: 12,
  },
  authErrorBox: {
    alignItems: 'center',
    gap: 16,
  },
  authErrorTitle: {
    color: '#FF4D4F',
    fontSize: 16,
    fontWeight: '600',
  },
  authRetryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  authRetryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  authSuccessBox: {
    alignItems: 'center',
    width: '100%',
  },
  googleAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authReadyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  authReadyEmail: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  authConfirmBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  authSimulateFailBtn: {
    marginTop: 16,
    padding: 8,
  },
  authSimulateText: {
    fontSize: 13,
  },
});
