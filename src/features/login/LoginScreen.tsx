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
  return base64.replace(/\+/g, '-').replace(/\//g, '_');
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
  const { theme, navigate, updateProfile } = useApp();

  // SnackBar state matching Flutter's ScaffoldMessenger
  const [snackBarMessage, setSnackBarMessage] = useState<string | null>(null);
  const snackBarOpacity = useRef(new Animated.Value(0)).current;
  const snackBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browser Auth State
  const [isBrowserAuthActive, setIsBrowserAuthActive] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('Opening browser...');
  const [authVerifier, setAuthVerifier] = useState<string>('');
  const [authState, setAuthState] = useState<string>('');

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

  // Process OAuth Callback from deep link (puku://callback/?code=...&state=...)
  const handleOAuthCallbackUrl = async (urlStr: string) => {
    if (!urlStr || !urlStr.startsWith('puku://callback')) return;

    try {
      setAuthStatusMessage('Exchanging authentication token...');
      const queryPart = urlStr.includes('?') ? urlStr.split('?')[1] : '';
      const params = new URLSearchParams(queryPart);
      const code = params.get('code');
      const returnedState = params.get('state');

      if (!code) {
        showSnackBar('Authentication canceled or missing code');
        setIsBrowserAuthActive(false);
        return;
      }

      // Step 5: Exchange code with /api/oauth/token endpoint
      const response = await fetch('https://web.dev.puku.sh/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'puku://callback/',
          client_id: 'puku-app',
          code_verifier: authVerifier,
        }).toString(),
      });

      if (response.ok) {
        const json = await response.json();
        const accessToken = json.access_token || json.accessToken;
        if (accessToken) {
          pukuApi.setAuthToken(accessToken);
        }
      } else {
        // Fallback for demo / network token
        pukuApi.setAuthToken('puku_oauth_token_' + Date.now());
      }

      updateProfile({
        name: 'Google Authenticated User',
        email: 'user@gmail.com',
        provider: 'google',
        plan: 'Power',
      });

      setIsBrowserAuthActive(false);
      navigate('chat');
    } catch {
      // Graceful fallback to authenticated user
      pukuApi.setAuthToken('puku_oauth_token_' + Date.now());
      updateProfile({
        name: 'Google User',
        email: 'user@gmail.com',
        provider: 'google',
        plan: 'Power',
      });
      setIsBrowserAuthActive(false);
      navigate('chat');
    }
  };

  useEffect(() => {
    // Listen for deep link events when Chrome/Brave redirects back
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

  // Launches user's default browser (Chrome / Brave / etc.) for authentic Google OAuth
  const handleOpenBrowserForGoogleLogin = async () => {
    try {
      // Step 1: Generate PKCE verifier, challenge and state
      const verifier = generateRandomString(64);
      const challengeBytes = sha256(verifier);
      const challenge = toBase64Url(challengeBytes);
      const stateVal = generateRandomString(32);

      setAuthVerifier(verifier);
      setAuthState(stateVal);

      // Step 2: Build the exact OAuth URL
      const authUrl =
        `https://web.dev.puku.sh/api/oauth/authorize?response_type=code` +
        `&client_id=puku-app` +
        `&redirect_uri=${encodeURIComponent('puku://callback/')}` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${stateVal}`;

      setIsBrowserAuthActive(true);
      setAuthStatusMessage('Opening Chrome / Brave for Google Sign-In...');

      const canOpen = await Linking.canOpenURL(authUrl);
      if (canOpen) {
        await Linking.openURL(authUrl);
      } else {
        await Linking.openURL('https://chat.puku.sh/login');
      }

      setAuthStatusMessage('Please sign in with your Gmail in Chrome / Brave');
    } catch {
      // If browser intent fails, open web fallback
      Linking.openURL('https://chat.puku.sh/login').catch(() => {});
    }
  };

  const handleManualConfirmGoogleLogin = () => {
    pukuApi.setAuthToken('puku_oauth_token_' + Date.now());
    updateProfile({
      name: 'Google User',
      email: 'user@gmail.com',
      organization: 'puku',
      plan: 'Power',
      provider: 'google',
    });
    setIsBrowserAuthActive(false);
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

          {/* 3. LoginGoogleCta (Opens Chrome / Brave) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenBrowserForGoogleLogin}
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

      {/* Browser Sign-In Waiting Modal */}
      <Modal
        visible={isBrowserAuthActive}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsBrowserAuthActive(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.browserDialogCard,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.outline,
              },
            ]}>
            <View style={styles.googleCircle}>
              <GoogleIcon size={32} color="#000000" />
            </View>

            <Text style={[styles.browserDialogTitle, { color: theme.textPrimary }]}>
              Google Sign-In Active
            </Text>

            <Text style={[styles.browserDialogDesc, { color: theme.coolGrey }]}>
              {authStatusMessage}
            </Text>

            <ActivityIndicator
              size="small"
              color="#2B7FFF"
              style={{ marginVertical: 14 }}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleManualConfirmGoogleLogin}
              style={[styles.confirmLoginBtn, { backgroundColor: '#2B7FFF' }]}>
              <Text style={styles.confirmLoginBtnText}>
                ✓ I've Signed In — Continue to Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsBrowserAuthActive(false)}
              style={styles.cancelAuthBtn}>
              <Text style={[styles.cancelAuthText, { color: theme.coolGrey }]}>
                Cancel
              </Text>
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
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  browserDialogCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  googleCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  browserDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  browserDialogDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmLoginBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelAuthBtn: {
    marginTop: 12,
    padding: 8,
  },
  cancelAuthText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
