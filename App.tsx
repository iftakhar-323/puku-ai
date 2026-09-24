/**
 * Puku AI - Main Application Entry
 * Built with the Puku AI Color Template & Visual Design
 *
 * @format
 */

import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';

function HamburgerMenu(): React.JSX.Element {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Menu"
      activeOpacity={0.7}
      style={styles.menuButton}>
      <View style={[styles.menuLine, styles.menuLineTop]} />
      <View style={[styles.menuLine, styles.menuLineMiddle]} />
      <View style={[styles.menuLine, styles.menuLineBottom]} />
    </TouchableOpacity>
  );
}

function PukuLogo(): React.JSX.Element {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoBadge}>
        {/* Stylized P Shape */}
        <View style={styles.logoShapeOuter}>
          <View style={styles.logoShapeStem} />
          <View style={styles.logoShapeLoop} />
        </View>
      </View>
    </View>
  );
}

function MicIcon(): React.JSX.Element {
  return (
    <View style={styles.micIconContainer}>
      <View style={styles.micBody} />
      <View style={styles.micBaseArc} />
      <View style={styles.micStand} />
    </View>
  );
}

function PukuHomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      {/* Top Header / Menu */}
      <View style={styles.header}>
        <HamburgerMenu />
      </View>

      {/* Center Hero Section */}
      <View style={styles.heroSection}>
        <PukuLogo />
        <Text style={styles.heroTitle}>
          How can i help you <Text style={styles.heroTitleSecondary}>today!</Text>
        </Text>
      </View>

      {/* Bottom Floating Chat Card */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.chatCard}>
          {/* Chat Placeholder */}
          <Text style={styles.chatPlaceholder}>Chat with Puku</Text>

          {/* Controls Row */}
          <View style={styles.chatControlsRow}>
            {/* Left Controls: Plus Button & Model Pill */}
            <View style={styles.leftControls}>
              <TouchableOpacity
                accessibilityLabel="Add attachment"
                activeOpacity={0.7}
                style={styles.iconCircleButton}>
                <Text style={styles.plusSign}>+</Text>
              </TouchableOpacity>

              <View style={styles.modelTagPill}>
                <Text style={styles.modelTagText}>puku-ai-2.7</Text>
              </View>
            </View>

            {/* Right Control: Mic Button */}
            <TouchableOpacity
              accessibilityLabel="Voice input"
              activeOpacity={0.7}
              style={styles.iconCircleButton}>
              <MicIcon />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <PukuHomeScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 12,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    gap: 5,
  },
  menuLine: {
    height: 2.5,
    backgroundColor: colors.menuIcon,
    borderRadius: 2,
  },
  menuLineTop: {
    width: 22,
  },
  menuLineMiddle: {
    width: 16,
  },
  menuLineBottom: {
    width: 10,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShapeOuter: {
    width: 28,
    height: 32,
    position: 'relative',
  },
  logoShapeStem: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 3.5,
  },
  logoShapeLoop: {
    position: 'absolute',
    left: 4,
    top: 0,
    width: 24,
    height: 20,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    backgroundColor: colors.primary,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroTitleSecondary: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 8,
  },
  chatCard: {
    backgroundColor: colors.chatBarBackground,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.chatBarBorder,
  },
  chatPlaceholder: {
    fontSize: 16,
    color: colors.placeholderText,
    fontWeight: '500',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  chatControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.buttonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusSign: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.tagText,
    marginTop: -2,
  },
  modelTagPill: {
    backgroundColor: colors.pillBackground,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 71, 235, 0.08)',
  },
  modelTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tagText,
    letterSpacing: 0.1,
  },
  micIconContainer: {
    width: 14,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 6,
    height: 10,
    backgroundColor: colors.tagText,
    borderRadius: 3,
  },
  micBaseArc: {
    width: 12,
    height: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.tagText,
    marginTop: -1,
  },
  micStand: {
    width: 1.5,
    height: 3,
    backgroundColor: colors.tagText,
  },
});

export default App;
