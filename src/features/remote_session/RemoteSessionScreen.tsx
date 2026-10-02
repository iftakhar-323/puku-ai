import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackIcon,
  CloseIcon,
  ConnectedLinkIcon,
  CopyIcon,
  LogoutIcon,
  TrashIcon,
} from '../../components/common/Icons';
import { useApp } from '../../store/AppContext';
import {
  useRelaySessionPolling,
  useRemoteSession,
} from '../../store/RemoteSessionContext';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';
import { NativeClipboard } from '../../services/nativeModules';
import { useToast } from '../../components/ui/Toast';
import { ThemeColors } from '../../theme/theme';
import type { ConnectionPhase, ToolCall } from './relay/protocol';
import { RemoteFeed } from './components/RemoteFeed';
import { RemoteComposer } from './components/RemoteComposer';
import { PromptCard } from './components/PromptCard';
import { ToolDetailSheet } from './components/ToolDetailSheet';
import { PairingView } from './components/PairingView';

const PHASE_SUBTITLE: Record<ConnectionPhase, string> = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  open: 'Waiting for laptop CLI…',
  attached: 'Remote control attached',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
};

class RemoteSessionErrorBoundary extends React.Component<
  {
    theme: ThemeColors;
    onReset: () => void;
    children: React.ReactNode;
  },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('RemoteSessionScreen caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { theme, onReset } = this.props;
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: theme.background,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: theme.textPrimary,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Session Display Recovered
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 18,
            }}
          >
            {this.state.error?.message ||
              'A display glitch was caught. Tap below to reload the session.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false, error: null });
              onReset();
            }}
            style={{
              backgroundColor: theme.textPrimary,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: theme.background,
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              Resume Session
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function RemoteSessionScreenContent() {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const { theme, goBack, navigate } = useApp();
  const {
    session,
    liveRelaySessions,
    isLoadingRelaySessions,
    connect,
    disconnect,
    sendMessage,
    interrupt,
    clearFeed,
    answerPrompt,
    answerQuestions,
    setPermissionMode,
    setModel,
    dismissNotice,
  } = useRemoteSession();
  const { show } = useToast();

  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const phase = session.phase;
  const isAttached = phase === 'attached';
  const showPairing = phase === 'idle';
  useRelaySessionPolling(showPairing);

  const handleCopy = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      NativeClipboard.setString(clean);
      try {
        Vibration.vibrate(40);
      } catch {
        // Haptics are optional.
      }
      show({ title: 'Copied to clipboard' });
    },
    [show],
  );

  const handleResend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

  const linkColor = isAttached
    ? theme.success
    : phase === 'closed'
    ? theme.error
    : phase === 'idle'
    ? theme.textMuted
    : theme.warning;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 10),
          paddingBottom:
            Platform.OS === 'android' && keyboardHeight > 0
              ? keyboardHeight + 10
              : Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigate('code')}
          style={[
            styles.circleBtn,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.outline,
            },
          ]}
        >
          <BackIcon size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.outline,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: theme.textPrimary }]}
          >
            {session.title || 'Laptop CLI'}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.headerSubtitle, { color: theme.textSecondary }]}
          >
            {isAttached && session.cwd ? session.cwd : PHASE_SUBTITLE[phase]}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Session controls"
          disabled={showPairing}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => setShowMenu(true)}
          style={[
            styles.circleBtn,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.outline,
            },
            showPairing && styles.dimmed,
          ]}
        >
          <ConnectedLinkIcon size={20} color={linkColor} />
        </TouchableOpacity>
      </View>

      {showPairing ? (
        <PairingView
          theme={theme}
          bottomInset={insets.bottom}
          liveSessions={liveRelaySessions}
          isLoading={isLoadingRelaySessions}
          initialSessionId={session.sessionId}
          initialToken={session.token}
          onConnect={connect}
        />
      ) : (
        <View style={styles.chat}>
          <ConnectionBanner
            phase={phase}
            theme={theme}
            onReconnect={() => connect(session.sessionId, session.token)}
            onStop={disconnect}
            onChangeSession={() => navigate('code')}
          />

          {session.notice ? (
            <View
              style={[styles.notice, { backgroundColor: theme.pillBackground }]}
            >
              <Text style={[styles.noticeText, { color: theme.error }]}>
                {session.notice}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={dismissNotice}
              >
                <CloseIcon size={12} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <RemoteFeed
            entries={session.entries}
            isWorking={session.isWorking}
            canResend={isAttached}
            theme={theme}
            keyboardHeight={keyboardHeight}
            onCopy={handleCopy}
            onResend={handleResend}
            onOpenTool={setSelectedTool}
          />

          {session.pendingPrompt ? (
            <PromptCard
              prompt={session.pendingPrompt}
              theme={theme}
              onAnswer={answerPrompt}
              onAnswerQuestions={answerQuestions}
            />
          ) : (
            <RemoteComposer
              theme={theme}
              enabled={isAttached}
              disabledHint={
                phase === 'closed'
                  ? 'Session closed'
                  : 'Waiting for your laptop…'
              }
              isWorking={session.isWorking}
              permissionMode={session.permissionMode}
              model={session.model}
              onSend={sendMessage}
              onInterrupt={interrupt}
              onSetPermissionMode={setPermissionMode}
              onSetModel={setModel}
            />
          )}
        </View>
      )}

      <ToolDetailSheet
        tool={selectedTool}
        theme={theme}
        onClose={() => setSelectedTool(null)}
      />

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
          style={styles.backdrop}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[
              styles.menuSheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: Math.max(insets.bottom + 12, 24),
              },
            ]}
          >
            <View
              style={[styles.menuHandle, { backgroundColor: theme.outline }]}
            />
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>
              Session controls
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy session ID"
              onPress={() => handleCopy(session.sessionId)}
              style={[styles.menuRow, { borderBottomColor: theme.outline }]}
            >
              <View style={styles.menuInfo}>
                <Text style={[styles.menuLabel, { color: theme.textMuted }]}>
                  Session ID
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.menuValue, { color: theme.success }]}
                >
                  {session.sessionId}
                </Text>
              </View>
              <CopyIcon size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <MenuAction
              theme={theme}
              label="Switch Terminal / View All Sessions"
              onPress={() => {
                setShowMenu(false);
                navigate('code');
              }}
            />
            <MenuAction
              theme={theme}
              label="Send interrupt (^C)"
              disabled={!isAttached}
              onPress={() => {
                setShowMenu(false);
                interrupt();
              }}
            />
            <MenuAction
              theme={theme}
              label="Clear feed"
              icon={<TrashIcon size={16} color={theme.textSecondary} />}
              onPress={() => {
                setShowMenu(false);
                clearFeed();
              }}
            />
            <MenuAction
              theme={theme}
              label="Disconnect remote control"
              color={theme.error}
              icon={<LogoutIcon size={16} color={theme.error} />}
              last
              onPress={() => {
                setShowMenu(false);
                disconnect();
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export function RemoteSessionScreen() {
  const { theme, goBack } = useApp();
  const { session, connect } = useRemoteSession();

  return (
    <RemoteSessionErrorBoundary
      theme={theme}
      onReset={() => {
        if (session.sessionId) {
          connect(session.sessionId, session.token);
        } else {
          goBack();
        }
      }}
    >
      <RemoteSessionScreenContent />
    </RemoteSessionErrorBoundary>
  );
}

function ConnectionBanner({
  phase,
  theme,
  onReconnect,
  onStop,
  onChangeSession,
}: {
  phase: ConnectionPhase;
  theme: ThemeColors;
  onReconnect: () => void;
  onStop: () => void;
  onChangeSession: () => void;
}) {
  if (phase === 'attached' || phase === 'idle') return null;

  const message =
    phase === 'connecting'
      ? 'Connecting to the relay…'
      : phase === 'open'
      ? 'Waiting for your laptop CLI…'
      : phase === 'reconnecting'
      ? 'Connection lost. Reconnecting…'
      : 'This session is closed.';

  return (
    <View
      style={[styles.banner, { backgroundColor: theme.pillBackground }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
        {message}
      </Text>
      {phase === 'reconnecting' && (
        <BannerButton theme={theme} label="Stop" onPress={onStop} />
      )}
      {phase === 'closed' && (
        <>
          <BannerButton
            theme={theme}
            label="Sessions"
            onPress={onChangeSession}
          />
          <BannerButton
            theme={theme}
            label="Reconnect"
            onPress={onReconnect}
            primary
          />
        </>
      )}
    </View>
  );
}

function BannerButton({
  theme,
  label,
  onPress,
  primary,
}: {
  theme: ThemeColors;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.bannerBtn,
        primary
          ? { backgroundColor: theme.textPrimary }
          : [styles.bannerBtnOutline, { borderColor: theme.outline }],
      ]}
    >
      <Text
        style={[
          styles.bannerBtnText,
          { color: primary ? theme.background : theme.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuAction({
  theme,
  label,
  icon,
  color,
  disabled,
  last,
  onPress,
}: {
  theme: ThemeColors;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.menuAction,
        { borderBottomColor: theme.outline },
        last && styles.menuActionLast,
        disabled && styles.dimmed,
      ]}
    >
      {icon}
      <Text
        style={[styles.menuActionText, { color: color || theme.textPrimary }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  dimmed: {
    opacity: 0.4,
  },
  chat: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  bannerBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerBtnOutline: {
    borderWidth: 1,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuInfo: {
    flex: 1,
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuActionLast: {
    borderBottomWidth: 0,
  },
  menuActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
