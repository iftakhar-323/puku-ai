import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { EyeIcon, EyeOffIcon, RemoteIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ActiveRelaySession } from '../../../types';

interface Props {
  theme: ThemeColors;
  bottomInset: number;
  liveSessions: ActiveRelaySession[];
  initialSessionId: string;
  initialToken: string;
  onConnect: (sessionId: string, token?: string) => void;
}

/** Shown before the first connection: detected laptop sessions + manual entry. */
export function PairingView({
  theme,
  bottomInset,
  liveSessions,
  initialSessionId,
  initialToken,
  onConnect,
}: Props) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [token, setToken] = useState(initialToken);
  const [showToken, setShowToken] = useState(false);

  const detected = liveSessions[0];

  // Prefill the first detected session once.
  useEffect(() => {
    if (!sessionId && detected) {
      setSessionId(detected.sessionId);
      if (detected.mobileToken) setToken(detected.mobileToken);
    }
  }, [detected, sessionId]);

  const canConnect = sessionId.trim().length > 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(bottomInset, 24) }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.outline }]}>
        <View style={styles.header}>
          <RemoteIcon size={24} color={theme.accent} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Connect to Laptop CLI</Text>
        </View>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Run /remote-control in Puku CLI on your laptop. Sessions on your account show up here
          automatically.
        </Text>

        {detected && (
          <View
            style={[
              styles.detected,
              { backgroundColor: theme.secondaryBackground, borderColor: theme.success },
            ]}>
            <View style={styles.detectedHeader}>
              <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.detectedTitle, { color: theme.textPrimary }]}>
                Laptop session online
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.detectedName, { color: theme.textSecondary }]}>
              {detected.title || 'puku-cli'}
            </Text>
            <Text selectable numberOfLines={1} style={[styles.detectedId, { color: theme.textMuted }]}>
              {detected.sessionId}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => onConnect(detected.sessionId, detected.mobileToken)}
              style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}>
              <Text style={[styles.primaryBtnText, { color: theme.background }]}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.label, { color: theme.textSecondary }]}>Relay session ID</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.secondaryBackground, borderColor: theme.outline, color: theme.textPrimary },
          ]}
          placeholder="e.g. af689a1b-2858-..."
          placeholderTextColor={theme.placeholderText}
          value={sessionId}
          onChangeText={setSessionId}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Relay session ID"
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Mobile token (optional)</Text>
        <View
          style={[
            styles.tokenWrap,
            { backgroundColor: theme.secondaryBackground, borderColor: theme.outline },
          ]}>
          <TextInput
            style={[styles.tokenInput, { color: theme.textPrimary }]}
            placeholder="Resolved automatically on the same account"
            placeholderTextColor={theme.placeholderText}
            secureTextEntry={!showToken}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Mobile token"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showToken ? 'Hide token' : 'Show token'}
            onPress={() => setShowToken(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.eyeBtn}>
            {showToken ? (
              <EyeOffIcon size={18} color={theme.textSecondary} />
            ) : (
              <EyeIcon size={18} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConnect }}
          disabled={!canConnect}
          onPress={() => onConnect(sessionId.trim(), token.trim() || undefined)}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.textPrimary },
            !canConnect && styles.disabled,
          ]}>
          <Text style={[styles.primaryBtnText, { color: theme.background }]}>Connect manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  detected: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  detectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  detectedName: {
    fontSize: 13,
    fontWeight: '600',
  },
  detectedId: {
    fontSize: 11.5,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
  },
  tokenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingRight: 10,
  },
  tokenInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.4,
  },
});
