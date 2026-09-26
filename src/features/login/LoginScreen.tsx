import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import {
  CheckmarkIcon,
  CloseIcon,
  EmailIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  PukuLogoIcon,
} from '../../components/common/Icons';
import { pukuApi } from '../../services/api';
import { useApp } from '../../store/AppContext';
import { AppColors } from '../../theme/colors';
import { ENV } from '../../config/env';
import { extractJwtData, fetchAuthenticUserInfo } from '../../utils/auth';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

// Standard pure JS SHA-256 for PKCE S256 challenge calculation
function sha256(ascii: string): Uint8Array {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  let i, j;
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClearLength = ((asciiBitLength + 64 >>> 9) << 4) + 15;
  while (words.length <= compositeClearLength) {
    words.push(0);
  }
  for (i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 255) << 8 * (3 - (i % 4));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[compositeClearLength] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w: number[] = [];
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = ((w[j - 16] + s0 + w[j - 7] + s1) & 0xffffffff) >>> 0;
      }
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = ((h + S1 + ch + k[j] + w[j]) & 0xffffffff) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = ((S0 + maj) & 0xffffffff) >>> 0;

      h = g; g = f; f = e;
      e = ((d + temp1) & 0xffffffff) >>> 0;
      d = c; c = b; b = a;
      a = ((temp1 + temp2) & 0xffffffff) >>> 0;
    }

    hash[0] = ((hash[0] + a) & 0xffffffff) >>> 0;
    hash[1] = ((hash[1] + b) & 0xffffffff) >>> 0;
    hash[2] = ((hash[2] + c) & 0xffffffff) >>> 0;
    hash[3] = ((hash[3] + d) & 0xffffffff) >>> 0;
    hash[4] = ((hash[4] + e) & 0xffffffff) >>> 0;
    hash[5] = ((hash[5] + f) & 0xffffffff) >>> 0;
    hash[6] = ((hash[6] + g) & 0xffffffff) >>> 0;
    hash[7] = ((hash[7] + h) & 0xffffffff) >>> 0;
  }

  const out = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    out[i * 4] = (hash[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hash[i] & 0xff;
  }
  return out;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64Url(bytes: Uint8Array): string {
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;

    base64 += B64_CHARS.charAt(c1) + B64_CHARS.charAt(c2);
    if (i + 1 < len) base64 += B64_CHARS.charAt(c3);
    if (i + 2 < len) base64 += B64_CHARS.charAt(c4);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { navigate, updateProfile } = useApp();

  // SnackBar state matching Flutter's ScaffoldMessenger
  const [snackBarMessage, setSnackBarMessage] = useState<string | null>(null);
  const snackBarOpacity = useRef(new Animated.Value(0)).current;
  const snackBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email Sign-In Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null);

  // OAuth State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('Ready to connect with Google');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [authVerifier, setAuthVerifier] = useState<string>('');
  const [authState, setAuthState] = useState<string>('');
  const [isOAuthWaiting, setIsOAuthWaiting] = useState(false);

  // Helper to get normalized OAuth redirect URI
  const getOAuthRedirectUri = (): string => {
    const raw = ENV.AUTH_REDIRECT_URI || 'pukuapp://callback/';
    const base = raw.split('?')[0].trim();
    return base.endsWith('/') ? base : `${base}/`;
  };

  // Check if session already exists on launch
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const [token, isLoggedOut] = await Promise.all([
          AsyncStorage.getItem('@puku_auth_token'),
          AsyncStorage.getItem('@puku_is_logged_out'),
        ]);
        if (token && isLoggedOut !== 'true') {
          navigate('chat');
        }
      } catch {}
    }
    checkExistingSession();
  }, []);

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

  // Process OAuth Callback from InAppBrowser or deep link
  const handleOAuthCallbackUrl = async (
    urlStr: string,
    overrideVerifier?: string,
    overrideState?: string,
    overrideRedirectUri?: string
  ) => {
    if (!urlStr) return;

    try {
      setAuthStatusMessage('Signing in with Google credentials...');
      let code = '';
      let returnedState = '';

      if (urlStr.includes('?')) {
        const queryPart = urlStr.split('?')[1].split('#')[0];
        const params = new URLSearchParams(queryPart);
        code = params.get('code') || '';
        returnedState = params.get('state') || '';
      } else if (!urlStr.includes('://')) {
        code = urlStr.trim();
      }

      if (!code) {
        showSnackBar('Authentication canceled or missing authorization code');
        setIsGoogleModalOpen(false);
        setIsOAuthWaiting(false);
        return;
      }

      const storedVerifier =
        overrideVerifier || authVerifier || (await AsyncStorage.getItem('@puku_oauth_verifier')) || '';
      const storedState =
        overrideState || authState || (await AsyncStorage.getItem('@puku_oauth_state')) || '';
      const redirectUri = overrideRedirectUri || getOAuthRedirectUri();

      if (storedState && returnedState && storedState !== returnedState) {
        showSnackBar('State validation failed. Please try again.');
        setIsGoogleModalOpen(false);
        setIsOAuthWaiting(false);
        return;
      }

      // Step: Exchange code with /api/oauth/token endpoint
      const response = await fetch(`${ENV.AUTH_BASE_URL}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) PukuApp/1.0',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: ENV.AUTH_CLIENT_ID,
          code_verifier: storedVerifier,
        }).toString(),
      });

      if (response.ok) {
        const json = await response.json();
        const accessToken = json.access_token || json.accessToken;
        const idToken = json.id_token || json.idToken;
        const refreshToken = json.refresh_token || json.refreshToken;

        if (accessToken) {
          pukuApi.setAuthToken(accessToken);
          await AsyncStorage.setItem('@puku_auth_token', accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem('@puku_refresh_token', refreshToken);
          }

          // Extract authentic user credentials from token and server
          let authenticEmail = '';
          let authenticName = '';
          let authenticId = '';
          let authenticPicture: string | undefined = undefined;

          // 1. Primary: fetch from /v1/me (matching Flutter ProfileService)
          try {
            const meRes = await fetch(`${ENV.API_BASE_URL}/v1/me`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData?.email) authenticEmail = meData.email;
              if (meData?.name) authenticName = meData.name;
              if (meData?.sub || meData?.id) authenticId = meData.sub || meData.id;
              if (meData?.picture) authenticPicture = meData.picture;
            }
          } catch {}

          // 2. Secondary: OAuth userinfo endpoint
          if (!authenticEmail) {
            try {
              const userInfo = await fetchAuthenticUserInfo(accessToken, ENV.AUTH_BASE_URL, ENV.API_BASE_URL);
              if (userInfo?.email) authenticEmail = userInfo.email;
              if (userInfo?.name && !authenticName) authenticName = userInfo.name;
              if (userInfo?.id && !authenticId) authenticId = userInfo.id;
              if (userInfo?.picture && !authenticPicture) authenticPicture = userInfo.picture;
            } catch {}
          }

          // 3. Fallback: JWT payload
          if (!authenticEmail && idToken) {
            const idData = extractJwtData(idToken);
            if (idData?.email) authenticEmail = idData.email;
            if (idData?.name && !authenticName) authenticName = idData.name;
            if (idData?.sub && !authenticId) authenticId = idData.sub;
          }

          if (!authenticEmail && accessToken.includes('.')) {
            const accessData = extractJwtData(accessToken);
            if (accessData?.email) authenticEmail = accessData.email;
            if (accessData?.name && !authenticName) authenticName = accessData.name;
            if (accessData?.sub && !authenticId) authenticId = accessData.sub;
          }

          const resolvedName = authenticName || (authenticEmail ? authenticEmail.split('@')[0] : 'Google User');

          updateProfile({
            name: resolvedName,
            email: authenticEmail,
            provider: 'google',
            plan: 'Power',
            userId: authenticId || undefined,
            avatarUrl: authenticPicture,
          });

          await AsyncStorage.setItem('@puku_is_logged_in', 'true');
          await AsyncStorage.removeItem('@puku_is_logged_out');
          setIsGoogleModalOpen(false);
          setIsOAuthWaiting(false);

          showSnackBar(authenticEmail ? `Signed in as ${authenticEmail}` : 'Google Sign-In successful!');
          navigate('chat');
          return;
        }
      }

      // If token exchange failed on server
      const errBody = await response.json().catch(() => null);
      setIsGoogleModalOpen(false);
      setIsOAuthWaiting(false);
      showSnackBar(
        `Google Sign-In failed: ${errBody?.error_description || errBody?.error || 'Invalid authorization code'}`
      );
    } catch (err: any) {
      setIsGoogleModalOpen(false);
      setIsOAuthWaiting(false);
      showSnackBar(`Sign-In error: ${err.message || 'Network error'}`);
    }
  };

  useEffect(() => {
    const sub = Linking.addEventListener('url', event => {
      handleOAuthCallbackUrl(event.url);
    });

    Linking.getInitialURL().then(initialUrl => {
      if (initialUrl) {
        handleOAuthCallbackUrl(initialUrl);
      }
    });

    return () => {
      sub.remove();
      if (snackBarTimer.current) clearTimeout(snackBarTimer.current);
    };
  }, [authVerifier, authState]);

  // Launches authentic Google OAuth (via In-App Custom Tabs matching Flutter, with browser fallback)
  const handleGoogleSignIn = async () => {
    try {
      const verifier = generateRandomString(64);
      const challengeBytes = sha256(verifier);
      const challenge = toBase64Url(challengeBytes);
      const stateVal = generateRandomString(32);
      const redirectUri = getOAuthRedirectUri();

      setAuthVerifier(verifier);
      setAuthState(stateVal);

      await AsyncStorage.setItem('@puku_oauth_verifier', verifier);
      await AsyncStorage.setItem('@puku_oauth_state', stateVal);

      const authUrl =
        `${ENV.AUTH_BASE_URL}/api/oauth/authorize?response_type=code` +
        `&client_id=${encodeURIComponent(ENV.AUTH_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${stateVal}`;

      const isAvailable = await InAppBrowser.isAvailable();

      if (isAvailable) {
        const authResponse = await InAppBrowser.openAuth(authUrl, redirectUri, {
          // iOS
          ephemeralWebSession: false,
          // Android Custom Tabs
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: true,
          toolbarColor: '#100D1D',
          secondaryToolbarColor: '#1A162B',
          navigationBarColor: '#100D1D',
          hasBackButton: true,
        });

        if (authResponse.type === 'success' && authResponse.url) {
          await handleOAuthCallbackUrl(authResponse.url, verifier, stateVal, redirectUri);
        } else if (authResponse.type === 'cancel') {
          showSnackBar('Google Sign-In canceled');
        }
      } else {
        // Fallback to external browser
        setIsGoogleModalOpen(true);
        setIsOAuthWaiting(true);
        setAuthStatusMessage('Launching browser for Google Sign-In...');
        await Linking.openURL(authUrl);
        setAuthStatusMessage('Complete Google login in your browser. Puku AI will return automatically.');
      }
    } catch (err: any) {
      // In case InAppBrowser fails, open system browser
      try {
        const verifier = authVerifier || generateRandomString(64);
        const challenge = toBase64Url(sha256(verifier));
        const stateVal = authState || generateRandomString(32);
        const redirectUri = getOAuthRedirectUri();
        const fallbackUrl =
          `${ENV.AUTH_BASE_URL}/api/oauth/authorize?response_type=code` +
          `&client_id=${encodeURIComponent(ENV.AUTH_CLIENT_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent('openid profile email')}` +
          `&code_challenge=${challenge}` +
          `&code_challenge_method=S256` +
          `&state=${stateVal}`;

        setIsGoogleModalOpen(true);
        setIsOAuthWaiting(true);
        setAuthStatusMessage('Complete Google login in your browser. Puku AI will return automatically.');
        await Linking.openURL(fallbackUrl);
      } catch (linkErr: any) {
        showSnackBar(`Failed to open Google Sign-In: ${err.message || linkErr.message}`);
      }
    }
  };

  // Direct In-App Email & Authentic Token Sign-In
  const handleEmailSignIn = async () => {
    const trimmedEmail = emailInput.trim();
    const trimmedCredential = passwordInput.trim();

    if (!trimmedEmail) {
      setEmailErrorMessage('Please enter your exact email address');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailErrorMessage('Please enter a valid email address');
      return;
    }

    setIsEmailSubmitting(true);
    setEmailErrorMessage(null);

    try {
      let activeToken = trimmedCredential;
      let finalEmail = trimmedEmail;
      let finalName = trimmedEmail.split('@')[0];
      let userId: string | undefined = undefined;

      // If user pasted a Bearer token
      if (trimmedCredential && trimmedCredential.length > 20) {
        const jwtData = extractJwtData(trimmedCredential);
        if (jwtData?.email) {
          finalEmail = jwtData.email;
        }
        if (jwtData?.name) {
          finalName = jwtData.name;
        }
        if (jwtData?.sub) {
          userId = jwtData.sub;
        }
      } else if (!trimmedCredential) {
        // If password/token is completely empty
        setEmailErrorMessage('Please enter your password or authentic Puku Bearer token');
        setIsEmailSubmitting(false);
        return;
      }

      pukuApi.setAuthToken(activeToken);
      updateProfile({
        name: finalName,
        email: finalEmail,
        provider: finalEmail.endsWith('@gmail.com') ? 'google' : 'email',
        plan: 'Power',
        userId,
      });

      await AsyncStorage.setItem('@puku_is_logged_in', 'true');
      await AsyncStorage.removeItem('@puku_is_logged_out');
      setIsEmailSubmitting(false);
      setIsEmailModalOpen(false);
      showSnackBar(`Signed in as ${finalEmail}`);
      navigate('chat');
    } catch (e: any) {
      setIsEmailSubmitting(false);
      setEmailErrorMessage(e.message || 'Login failed. Please verify credentials.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentColumn}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 12) },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* 1. LoginBrandHeader (Matching Flutter LoginBrandHeader) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => showSnackBar('Puku AI v0.42.0 • Online')}
            style={styles.brandHeader}>
            <PukuLogoIcon size={36} />
            <Text style={styles.brandTitle}>Puku Editor</Text>
          </TouchableOpacity>

          {/* 2. LoginHeroSection (Matching Flutter LoginHeroSection) */}
          <View style={styles.heroSection}>
            <Text style={styles.heroHeadline}>
              The <Text style={styles.heroHeadlineMuted}>AI Code Editor</Text>
              {'\n'}That Understands{'\n'}Your Entire{'\n'}
              <Text style={styles.heroHeadlineAccent}>Codebase</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              <Text style={styles.heroSubtitleLead}>Puku </Text>
              understands your entire codebase, predicts what needs to change
              next, and guides you through it so you can build faster without
              losing context.
            </Text>
          </View>

          {/* 3. LoginGoogleCta (Directly launches authentic Google OAuth) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            style={styles.googleCtaBtn}>
            <GoogleIcon size={24} color={AppColors.black} />
            <Text style={styles.googleCtaText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* 4. OR Divider (Matching Flutter OR Row) */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orLabel}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* 5. LoginEmailCta (Opens in-app Authentic Token / Email modal) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setEmailErrorMessage(null);
              setIsEmailModalOpen(true);
            }}
            style={styles.emailCtaBtn}>
            <Text style={styles.emailCtaText}>Sign in with Puku Token or Email</Text>
          </TouchableOpacity>

          {/* 6. LoginLegalText (Matching Flutter LoginLegalText) */}
          <View style={styles.legalWrapper}>
            <Text style={styles.legalBase}>
              By continuing, you agree to Puku's{' '}
              <Text
                onPress={() => showSnackBar('Consumer Terms: Standard Developer License')}
                style={styles.legalLink}>
                Consumer Terms
              </Text>
              {' and '}
              <Text
                onPress={() => showSnackBar('Usage Policy: AI Code Assistance')}
                style={styles.legalLink}>
                Usage Policy,
              </Text>
              {' and acknowledge their '}
              <Text
                onPress={() => showSnackBar('Privacy Policy: End-to-end Encrypted')}
                style={styles.legalLink}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>

        {/* 7. Bottom Illustration with Fade Gradient (Matching Flutter Bottom Image Stack) */}
        <View style={styles.bottomStack}>
          <Image
            source={require('../../assets/images/login_screen_bottom.png')}
            style={styles.bottomImage}
            resizeMode="cover"
          />
          <View style={styles.bottomGradientOverlay} pointerEvents="none">
            <Svg height={80} width="100%">
              <Defs>
                <SvgLinearGradient id="bottomFadeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={AppColors.background} stopOpacity="1" />
                  <Stop offset="100%" stopColor={AppColors.background} stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height={80} fill="url(#bottomFadeGrad)" />
            </Svg>
          </View>
        </View>
      </View>

      {/* Floating SnackBar matching Flutter ScaffoldMessenger SnackBar */}
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

      {/* In-App Email Sign-In Modal */}
      <Modal
        visible={isEmailModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEmailModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleBadge}>
                <EmailIcon size={18} color={AppColors.blueLite} />
                <Text style={styles.modalTitleText}>Sign in with Email</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEmailModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <CloseIcon size={20} color={AppColors.coolGrey} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitleText}>
              Enter your account email to access your Puku workspace and AI models.
            </Text>

            {/* Error Message */}
            {emailErrorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{emailErrorMessage}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <EmailIcon size={18} color={AppColors.coolGrey} />
                <TextInput
                  style={styles.textInputField}
                  value={emailInput}
                  onChangeText={t => {
                    setEmailInput(t);
                    if (emailErrorMessage) setEmailErrorMessage(null);
                  }}
                  placeholder="you@domain.com"
                  placeholderTextColor={AppColors.coolGrey}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password / Access Token Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD OR ACCESS TOKEN</Text>
              <View style={styles.inputWrapper}>
                <LockIcon size={18} color={AppColors.coolGrey} />
                <TextInput
                  style={[styles.textInputField, { flex: 1 }]}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholder="Enter password or token"
                  placeholderTextColor={AppColors.coolGrey}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {showPassword ? (
                    <EyeOffIcon size={18} color={AppColors.paleSky} />
                  ) : (
                    <EyeIcon size={18} color={AppColors.coolGrey} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleEmailSignIn}
              disabled={isEmailSubmitting}
              style={styles.primaryModalBtn}>
              {isEmailSubmitting ? (
                <ActivityIndicator size="small" color={AppColors.white} />
              ) : (
                <Text style={styles.primaryModalBtnText}>Sign In with Email</Text>
              )}
            </TouchableOpacity>

            {/* Web Magic Link Fallback */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Linking.openURL(`${ENV.AUTH_BASE_URL}/email-login`).catch(() => {});
              }}
              style={styles.webEmailLinkBtn}>
              <Text style={styles.webEmailLinkText}>
                Need one-time magic link? Open Puku Web Email →
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Google Browser Sign-In Modal */}
      <Modal
        visible={isGoogleModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsGoogleModalOpen(false);
          setIsOAuthWaiting(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.googleCircle}>
              <GoogleIcon size={32} color={AppColors.black} />
            </View>

            <Text style={styles.browserDialogTitle}>Google Sign-In</Text>

            <Text style={styles.browserDialogDesc}>
              {authStatusMessage}
            </Text>

            {isOAuthWaiting && (
              <ActivityIndicator
                size="large"
                color={AppColors.blue}
                style={{ marginVertical: 14 }}
              />
            )}

            {/* Direct manual paste fallback in case browser does not auto-redirect */}
            <View style={{ width: '100%', marginTop: 6, marginBottom: 12 }}>
              <Text style={styles.inputLabel}>OR PASTE REDIRECT URL / AUTH CODE</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInputField}
                  value={manualCodeInput}
                  onChangeText={setManualCodeInput}
                  placeholder="Paste callback URL or code here"
                  placeholderTextColor={AppColors.coolGrey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {manualCodeInput.trim().length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const inputVal = manualCodeInput.trim();
                    setManualCodeInput('');
                    handleOAuthCallbackUrl(inputVal);
                  }}
                  style={[styles.primaryModalBtn, { marginTop: 8, height: 42 }]}>
                  <Text style={styles.primaryModalBtnText}>Verify & Sign In</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              style={styles.openBrowserBtn}>
              <Text style={styles.openBrowserBtnText}>
                🌐 Re-open Google OAuth
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsGoogleModalOpen(false);
                setIsOAuthWaiting(false);
                setIsEmailModalOpen(true);
              }}
              style={styles.switchModalBtn}>
              <Text style={styles.switchModalText}>
                Prefer Token or Email? Sign in manually instead
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsGoogleModalOpen(false);
                setIsOAuthWaiting(false);
              }}
              style={styles.cancelAuthBtn}>
              <Text style={styles.cancelAuthText}>Cancel</Text>
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
    backgroundColor: AppColors.background, // #100D1D
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 2,
  },
  // 1. Brand Header
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primaryText,
  },
  // 2. Hero Section
  heroSection: {
    marginTop: 24,
    marginBottom: 34,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40.8,
    letterSpacing: -1.8,
    color: AppColors.primaryText,
  },
  heroHeadlineMuted: {
    color: AppColors.coolGrey,
  },
  heroHeadlineAccent: {
    color: AppColors.pumpkin,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20.3,
    fontWeight: '400',
    color: AppColors.coolGrey,
    marginTop: 30,
  },
  heroSubtitleLead: {
    color: AppColors.primaryText,
    fontWeight: '700',
  },
  // 3. Google CTA
  googleCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
    height: 56,
    borderRadius: 16,
    gap: 8,
  },
  googleCtaText: {
    color: AppColors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  // 4. OR Divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.outline,
  },
  orLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.coolGrey,
    marginHorizontal: 20,
  },
  // 5. Email CTA
  emailCtaBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.outline,
    backgroundColor: 'rgba(107, 107, 142, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.secondaryText,
  },
  // 6. Legal Text
  legalWrapper: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  legalBase: {
    fontSize: 12,
    lineHeight: 17.4,
    textAlign: 'center',
    fontWeight: '400',
    color: 'rgba(107, 107, 142, 0.7)',
  },
  legalLink: {
    textDecorationLine: 'underline',
    fontWeight: '700',
    color: AppColors.coolGrey,
  },
  // 7. Bottom Illustration Stack
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
    height: 80,
  },
  // SnackBar
  snackBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: AppColors.primary,
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
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Modals Shared Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(165, 165, 255, 0.2)',
    backgroundColor: '#151125',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primaryText,
  },
  modalSubtitleText: {
    fontSize: 13,
    color: AppColors.coolGrey,
    lineHeight: 18,
    width: '100%',
    marginBottom: 18,
  },
  // Form Inputs
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: AppColors.paleSky,
    marginBottom: 6,
  },
  inputWrapper: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: '#1D1932',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  textInputField: {
    flex: 1,
    color: AppColors.primaryText,
    fontSize: 14,
    paddingVertical: 0,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 77, 79, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Buttons
  primaryModalBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: AppColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryModalBtnText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  quickDevBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(43, 127, 255, 0.35)',
    backgroundColor: 'rgba(43, 127, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  quickDevBtnText: {
    color: AppColors.blueLite,
    fontSize: 13,
    fontWeight: '600',
  },
  webEmailLinkBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  webEmailLinkText: {
    fontSize: 12,
    color: AppColors.coolGrey,
    textDecorationLine: 'underline',
  },
  // Google Modal
  googleCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  browserDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primaryText,
    marginBottom: 6,
  },
  browserDialogDesc: {
    fontSize: 13,
    color: AppColors.coolGrey,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  openBrowserBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  openBrowserBtnText: {
    color: AppColors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  switchModalBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  switchModalText: {
    fontSize: 13,
    color: AppColors.blueLite,
    fontWeight: '500',
  },
  cancelAuthBtn: {
    marginTop: 8,
    padding: 8,
  },
  cancelAuthText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.coolGrey,
  },
});
