import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  PukuRemoteGradientIcon,
} from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import { ActiveRelaySession } from '../../../types';
import { formatActivityDate } from '../../../utils/date';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Props {
  theme: ThemeColors;
  bottomInset: number;
  liveSessions: ActiveRelaySession[];
  isLoading: boolean;
  initialSessionId: string;
  initialToken: string;
  onConnect: (sessionId: string, token?: string) => void;
}

function shortId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 13)}…` : id;
}

/** Shown before the first connection: detected laptop sessions + manual entry. */
export function PairingView({
  theme,
  bottomInset,
  liveSessions,
  isLoading,
  initialSessionId,
  initialToken,
  onConnect,
}: Props) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [token, setToken] = useState(initialToken);
  const [showToken, setShowToken] = useState(false);
  const [showManual, setShowManual] = useState(!!initialSessionId);

  // Prefill from the first detected session once a user picks "connect manually"
  // after sessions arrive, so the field isn't empty when they open it.
  const didPrefill = useRef(false);
  useEffect(() => {
    if (!didPrefill.current && !sessionId && liveSessions[0]) {
      didPrefill.current = true;
      setSessionId(liveSessions[0].sessionId);
      if (liveSessions[0].mobileToken) setToken(liveSessions[0].mobileToken);
    }
  }, [liveSessions, sessionId]);

  const canConnect = sessionId.trim().length > 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(bottomInset, 24) },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.headerIcon, { backgroundColor: theme.pillBackground }]}
        >
          <PukuRemoteGradientIcon size={24} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Connect to Laptop CLI
        </Text>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Run{' '}
          <Text style={[styles.hintCode, { color: theme.textPrimary }]}>
            /remote-control
          </Text>{' '}
          in Puku CLI on your laptop. Sessions on your account show up below
          automatically.
        </Text>
      </View>

      {liveSessions.length > 0 ? (
        <View style={styles.sessionList}>
          {liveSessions.map(s => (
            <View
              key={s.sessionId}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.outline,
                },
              ]}
            >
              <View
                style={[styles.liveDot, { backgroundColor: theme.success }]}
              />
              <View style={styles.sessionInfo}>
                <Text
                  numberOfLines={1}
                  style={[styles.sessionTitle, { color: theme.textPrimary }]}
                >
                  {s.title || 'puku-cli'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.sessionMeta, { color: theme.textMuted }]}
                >
                  Online · {formatActivityDate(s.titleUpdatedAt || s.createdAt)}{' '}
                  · {shortId(s.sessionId)}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Connect to ${s.title || 'laptop session'}`}
                onPress={() => onConnect(s.sessionId, s.mobileToken)}
                style={[styles.connectPill, { backgroundColor: theme.textPrimary }]}
              >
                <Text style={[styles.connectPillText, { color: theme.background }]}>
                  Connect
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.outline },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <View
              style={[styles.emptyDot, { backgroundColor: theme.textMuted }]}
            />
          )}
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {isLoading
              ? 'Looking for sessions on your account…'
              : 'No laptop sessions found yet'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: showManual }}
        onPress={() => setShowManual(v => !v)}
        style={styles.manualToggle}
      >
        <Text style={[styles.manualToggleText, { color: theme.textSecondary }]}>
          Connect with a session ID instead
        </Text>
        {showManual ? (
          <ChevronDownIcon size={14} color={theme.textSecondary} />
        ) : (
          <ChevronRightIcon size={14} color={theme.textSecondary} />
        )}
      </TouchableOpacity>

      {showManual && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.outline },
          ]}
        >
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Relay session ID
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.outline,
                color: theme.textPrimary,
                fontFamily: monoFont,
              },
            ]}
            placeholder="e.g. af689a1b-2858-..."
            placeholderTextColor={theme.placeholderText}
            value={sessionId}
            onChangeText={setSessionId}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Relay session ID"
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Mobile token (optional)
          </Text>
          <View
            style={[
              styles.tokenWrap,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.outline,
              },
            ]}
          >
            <TextInput
              style={[
                styles.tokenInput,
                { color: theme.textPrimary, fontFamily: monoFont },
              ]}
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
              style={styles.eyeBtn}
            >
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
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: theme.background }]}>
              Connect manually
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  hintCode: {
    fontFamily: monoFont,
    fontSize: 12.5,
    fontWeight: '700',
  },
  sessionList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 11.5,
  },
  connectPill: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  connectPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 13,
    flex: 1,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  manualToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
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
