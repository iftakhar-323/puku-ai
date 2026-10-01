/**
 * Remote control of the laptop CLI over the Puku relay.
 *
 * Lives in its own context so that live-streamed CLI output only re-renders
 * remote-session consumers, not the whole app. Frame handling is the pure
 * reducer in features/remote_session/relay/protocol.ts; this file owns the
 * socket, reconnect backoff and side effects.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveRelaySession } from '../types';
import { ENV } from '../config/env';
import { pukuApi } from '../services/api';
import { tokenManager } from '../services/tokenManager';
import { secureStorage } from '../services/secureStorage';
import { devWarn, ignore } from '../utils/devLog';
import { useApp } from './AppContext';
import {
  MAX_RECONNECT_ATTEMPTS,
  PendingControl,
  PermissionMode,
  RelayEffect,
  RemoteSessionState,
  WORKING_TIMEOUT_MS,
  addEntry,
  addLocalUser,
  addSystem,
  applyFrame,
  controlFrame,
  createInitialState,
  giveUpOnTurn,
  hasRunningTool,
  interruptFrame,
  makeRequestId,
  parseMessage,
  permissionReply,
  questionReply,
  reconnectDelay,
  shouldReconnect,
  userFrame,
} from '../features/remote_session/relay/protocol';

interface RemoteSessionContextValue {
  session: RemoteSessionState;
  /** A connection is open or being (re)established. */
  isActive: boolean;
  activeRelaySessions: ActiveRelaySession[];
  /** Listed sessions whose CLI is online and not expired. */
  liveRelaySessions: ActiveRelaySession[];
  isLoadingRelaySessions: boolean;
  fetchActiveRelaySessions: () => Promise<ActiveRelaySession[]>;
  connect: (sessionId: string, token?: string) => void;
  disconnect: () => void;
  sendMessage: (text: string) => boolean;
  interrupt: () => void;
  clearFeed: () => void;
  answerPrompt: (allow: boolean | 'always', message?: string) => void;
  answerQuestions: (answers: Record<string, string[]> | null) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  setModel: (model: string) => void;
  dismissNotice: () => void;
}

const RemoteSessionContext = createContext<RemoteSessionContextValue | null>(
  null,
);

const reconnectTokenKey = (sessionId: string) =>
  `@puku_remote_reconnect_${sessionId}`;

// SecureStore has no way to list its keys, so we keep a small AsyncStorage
// registry of session ids that have a reconnect token, purely so logout can
// find and sweep them (they're otherwise never cleared by tokenManager,
// which only owns the account access/refresh tokens).
const reconnectRegistryKey = '@puku_remote_reconnect_keys';

async function registerReconnectSession(sessionId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(reconnectRegistryKey);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(sessionId)) {
      await AsyncStorage.setItem(
        reconnectRegistryKey,
        JSON.stringify([...ids, sessionId]),
      );
    }
  } catch (err) {
    devWarn('remote.registerReconnectSession', err);
  }
}

async function sweepReconnectTokens(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(reconnectRegistryKey);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    await Promise.all(
      ids.map(id => secureStorage.removeItem(reconnectTokenKey(id))),
    );
    await AsyncStorage.removeItem(reconnectRegistryKey);
  } catch (err) {
    devWarn('remote.sweepReconnectTokens', err);
  }
}

async function resolveAccountToken(): Promise<string> {
  return (
    (await tokenManager.ensureValidToken().catch(() => null)) ||
    (await tokenManager.getAccessToken().catch(() => null)) ||
    pukuApi.getAuthToken() ||
    ''
  );
}

export function RemoteSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useApp();

  const [session, setSession] =
    useState<RemoteSessionState>(createInitialState);
  const [activeRelaySessions, setActiveRelaySessions] = useState<
    ActiveRelaySession[]
  >([]);
  const [isLoadingRelaySessions, setIsLoadingRelaySessions] = useState(false);

  // The reducer runs against this ref so side effects never run inside a
  // setState updater; renders are coalesced to one per animation frame.
  const stateRef = useRef<RemoteSessionState>(session);
  const flushPending = useRef(false);
  // Gives up on a turn that's gone silent with no running tool — most often
  // because the CLI's closing `result` frame never reached us. Rearmed on
  // every state change so it only fires after real inactivity.
  const workingWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const connRef = useRef<{
    sessionId: string;
    mobileToken: string;
    accountToken: string;
  } | null>(null);
  const attemptRef = useRef(0);
  // Bumped by disconnect() to invalidate any connect() call still awaiting
  // its token/auth fetches, so a disconnect tapped mid-connect sticks.
  const connectGeneration = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // After a reconnect the CLI replays what we missed; skip frames already applied.
  const seenFrameIds = useRef<Set<string>>(new Set());

  const update = useCallback(
    (fn: (s: RemoteSessionState) => RemoteSessionState) => {
      stateRef.current = fn(stateRef.current);

      if (workingWatchdog.current) {
        clearTimeout(workingWatchdog.current);
        workingWatchdog.current = null;
      }
      if (stateRef.current.isWorking && !hasRunningTool(stateRef.current)) {
        workingWatchdog.current = setTimeout(() => {
          workingWatchdog.current = null;
          update(giveUpOnTurn);
        }, WORKING_TIMEOUT_MS);
      }

      if (!flushPending.current) {
        flushPending.current = true;
        requestAnimationFrame(() => {
          flushPending.current = false;
          setSession(stateRef.current);
        });
      }
    },
    [],
  );

  const send = useCallback((payload: Record<string, any>): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      devWarn('remote.send', err);
      return false;
    }
  }, []);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  /** Close the socket without triggering a reconnect. */
  const closeSocket = useCallback(() => {
    clearReconnectTimer();
    if (workingWatchdog.current) {
      clearTimeout(workingWatchdog.current);
      workingWatchdog.current = null;
    }
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000);
      } catch (err) {
        devWarn('remote.close', err);
      }
    }
  }, []);

  const runEffects = useCallback(
    (effects: RelayEffect[]) => {
      for (const effect of effects) {
        switch (effect.type) {
          case 'send':
            send(effect.payload);
            break;
          case 'vibrate':
            try {
              Vibration.vibrate([0, 180, 80, 220]);
            } catch (err) {
              devWarn('remote.vibrate', err);
            }
            break;
          case 'saveReconnectToken': {
            const sid = connRef.current?.sessionId;
            if (sid) {
              secureStorage
                .setItem(reconnectTokenKey(sid), effect.token)
                .catch(ignore('remote.saveReconnectToken'));
              registerReconnectSession(sid).catch(
                ignore('remote.registerReconnectSession'),
              );
            }
            break;
          }
          case 'close':
            closeSocket();
            break;
        }
      }
    },
    [send, closeSocket],
  );

  // `openSocket` and `scheduleReconnect` call each other; the ref breaks the cycle.
  const openSocketRef = useRef<() => Promise<void>>(async () => {});

  const scheduleReconnect = useCallback(
    (code?: number) => {
      const attempt = attemptRef.current;
      if (!shouldReconnect(code) || attempt >= MAX_RECONNECT_ATTEMPTS) {
        const gone = code !== undefined && code >= 4000 && code < 5000;
        update(s =>
          addSystem(
            {
              ...s,
              phase: 'closed',
              isWorking: false,
              pendingPrompt: undefined,
            },
            gone
              ? 'This session has expired. Run /remote-control on your laptop to pair again.'
              : 'Could not reach your laptop. Tap Reconnect to try again.',
            'error',
          ),
        );
        return;
      }
      const delay = reconnectDelay(attempt);
      attemptRef.current = attempt + 1;
      update(s => ({ ...s, phase: 'reconnecting', isWorking: false }));
      clearReconnectTimer();
      reconnectTimer.current = setTimeout(() => {
        openSocketRef.current();
      }, delay);
    },
    [update],
  );

  const openSocket = useCallback(async () => {
    const conn = connRef.current;
    if (!conn) return;

    const reconnectToken = await secureStorage
      .getItem(reconnectTokenKey(conn.sessionId))
      .catch(() => null);
    // connect()/disconnect() may have run while we awaited.
    if (connRef.current !== conn) return;

    const base = ENV.REMOTE_SESSION_RELAY_HOST.replace(/^http/, 'ws');
    const url =
      `${base}/client/${encodeURIComponent(
        conn.sessionId,
      )}?token=${encodeURIComponent(conn.mobileToken)}` +
      (reconnectToken
        ? `&reconnectToken=${encodeURIComponent(reconnectToken)}`
        : '');

    let ws: WebSocket;
    try {
      // RN's WebSocket accepts headers as a third argument.
      ws = new (WebSocket as any)(url, undefined, {
        headers: {
          'X-Puku-Mobile-Token': conn.mobileToken,
          'X-Puku-Account-Token': conn.accountToken,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) PukuMobile/1.0',
        },
      });
    } catch (err) {
      devWarn('remote.open', err);
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      attemptRef.current = 0;
      // Input stays disabled until the CLI attaches (worker_connected / init).
      update(s => ({ ...s, phase: 'open' }));
    };

    ws.onmessage = (event: WebSocketMessageEvent) => {
      if (wsRef.current !== ws) return;
      const raw = typeof event.data === 'string' ? event.data : '';
      const { frames, text } = parseMessage(raw);
      const effects: RelayEffect[] = [];
      let next = stateRef.current;
      for (const line of text)
        next = addEntry(next, { kind: 'assistant', text: line });
      for (const frame of frames) {
        const frameId: unknown = frame?.uuid;
        if (typeof frameId === 'string' && frame?.type !== 'control_request') {
          if (seenFrameIds.current.has(frameId)) continue;
          seenFrameIds.current.add(frameId);
        }
        if (__DEV__) {
          console.log(
            '[RemoteRelay] frame',
            frame?.type,
            frame?.event?.type || frame?.subtype || '',
          );
        }
        const result = applyFrame(next, frame);
        next = result.state;
        effects.push(...result.effects);
      }
      update(() => next);
      runEffects(effects);
    };

    ws.onerror = (err: Event) => {
      devWarn('remote.socket', err);
    };

    ws.onclose = (e: WebSocketCloseEvent) => {
      // A stale socket from a previous connect must not touch the current one.
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      if (stateRef.current.phase === 'closed') return;
      devWarn('remote.closed', `${e.code} ${e.reason || ''}`);
      scheduleReconnect(e.code);
    };
  }, [runEffects, scheduleReconnect, update]);
  openSocketRef.current = openSocket;

  const fetchSessionsWithStatus = useCallback(async (): Promise<{
    sessions: ActiveRelaySession[];
    status: number;
  }> => {
    setIsLoadingRelaySessions(true);
    try {
      const accessToken = await resolveAccountToken();
      if (!accessToken) return { sessions: [], status: 401 };
      const response = await fetch(
        `${ENV.REMOTE_SESSION_RELAY_HOST}/v1/sessions?mine=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'puku-ai-app/1.0',
          },
        },
      );
      if (!response.ok) return { sessions: [], status: response.status };
      const data = await response.json();
      const sessions: ActiveRelaySession[] = Array.isArray(data.sessions)
        ? data.sessions
        : [];
      setActiveRelaySessions(sessions);
      return { sessions, status: response.status };
    } catch (err) {
      devWarn('remote.fetchSessions', err);
      return { sessions: [], status: 0 };
    } finally {
      setIsLoadingRelaySessions(false);
    }
  }, []);

  const fetchActiveRelaySessions = useCallback(
    async () => (await fetchSessionsWithStatus()).sessions,
    [fetchSessionsWithStatus],
  );

  const connect = useCallback(
    async (sessionId: string, token?: string) => {
      closeSocket();
      attemptRef.current = 0;
      const generation = ++connectGeneration.current;

      const sameSession = stateRef.current.sessionId === sessionId;
      if (!sameSession) seenFrameIds.current = new Set();
      const listed = activeRelaySessions.find(s => s.sessionId === sessionId);
      update(s => ({
        ...(sameSession ? s : createInitialState()),
        sessionId,
        title: listed?.title || (sameSession ? s.title : undefined),
        phase: 'connecting',
        notice: undefined,
      }));

      const accountToken = await resolveAccountToken();
      let mobileToken = (token || '').trim() || listed?.mobileToken || '';
      if (!mobileToken && accountToken) {
        try {
          const res = await fetch(
            `${ENV.REMOTE_SESSION_RELAY_HOST}/v1/sessions/${sessionId}/info`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accountToken}`,
                'User-Agent': 'puku-ai-app/1.0',
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            mobileToken = data.mobileToken || data.mobile_token || '';
          }
        } catch (err) {
          devWarn('remote.resolveMobileTokenInfo', err);
        }

        if (!mobileToken) {
          try {
            const res = await fetch(
              `${ENV.REMOTE_SESSION_RELAY_HOST}/v1/sessions/${sessionId}/auth`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accountToken}`,
                  'User-Agent': 'puku-ai-app/1.0',
                },
              },
            );
            if (res.ok) mobileToken = (await res.json()).mobileToken || '';
          } catch (err) {
            devWarn('remote.resolveMobileTokenAuth', err);
          }
        }
      }

      // A disconnect() (or a newer connect()) ran while we were awaiting
      // the token/auth fetches above: don't resurrect this attempt.
      if (connectGeneration.current !== generation) return;

      connRef.current = { sessionId, mobileToken, accountToken };
      update(s => ({ ...s, token: mobileToken }));
      await openSocket();
    },
    [activeRelaySessions, closeSocket, openSocket, update],
  );

  const disconnect = useCallback(() => {
    connectGeneration.current++;
    connRef.current = null;
    closeSocket();
    update(s =>
      s.phase === 'idle'
        ? s
        : addSystem(
            {
              ...s,
              phase: 'closed',
              isWorking: false,
              pendingPrompt: undefined,
            },
            'Disconnected from laptop.',
          ),
    );
  }, [closeSocket, update]);

  const sendMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed || stateRef.current.phase !== 'attached') return false;
      if (!send(userFrame(trimmed, stateRef.current.sessionId))) return false;
      update(s => addLocalUser(s, trimmed));
      return true;
    },
    [send, update],
  );

  const interrupt = useCallback(() => {
    if (send(interruptFrame())) {
      update(s => addSystem({ ...s, isWorking: false }, 'Interrupt sent'));
    }
  }, [send, update]);

  const clearFeed = useCallback(() => {
    update(s => ({ ...s, entries: [] }));
  }, [update]);

  const sendControl = useCallback(
    (control: PendingControl) => {
      const requestId = makeRequestId();
      if (!send(controlFrame(requestId, control))) return;
      update(s => ({
        ...s,
        pendingControls: { ...s.pendingControls, [requestId]: control },
      }));
    },
    [send, update],
  );

  const answerPrompt = useCallback(
    (allow: boolean | 'always', message?: string) => {
      const prompt = stateRef.current.pendingPrompt;
      if (!prompt) return;
      send(
        permissionReply(
          prompt.requestId,
          allow,
          message,
          prompt.input,
          prompt.permissionSuggestions,
        ),
      );
      if (allow === 'always') {
        sendControl({ subtype: 'set_permission_mode', value: 'auto' });
      }
      update(s => ({ ...s, pendingPrompt: undefined }));
    },
    [send, sendControl, update],
  );

  const answerQuestions = useCallback(
    (answers: Record<string, string[]> | null) => {
      const prompt = stateRef.current.pendingPrompt;
      if (!prompt) return;
      send(questionReply(prompt, answers));
      update(s => ({ ...s, pendingPrompt: undefined }));
    },
    [send, update],
  );

  const setPermissionMode = useCallback(
    (mode: PermissionMode) =>
      sendControl({ subtype: 'set_permission_mode', value: mode }),
    [sendControl],
  );

  const setModel = useCallback(
    (model: string) => sendControl({ subtype: 'set_model', value: model }),
    [sendControl],
  );

  const dismissNotice = useCallback(() => {
    update(s => ({ ...s, notice: undefined }));
  }, [update]);

  // Retry immediately when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && stateRef.current.phase === 'reconnecting') {
        clearReconnectTimer();
        openSocketRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  // Signing out ends any remote session and sweeps reconnect tokens left
  // over from it. Gated on a true logged-in -> logged-out transition (not
  // just "email is falsy") so a cold boot, where profile.email is briefly
  // empty while restoreSession() runs, doesn't wipe a still-valid session's
  // reconnect tokens out from under it.
  const wasLoggedIn = useRef(!!profile.email);
  useEffect(() => {
    if (!profile.email) {
      if (connRef.current) disconnect();
      if (wasLoggedIn.current) {
        sweepReconnectTokens().catch(ignore('remote.sweepReconnectTokens'));
      }
    }
    wasLoggedIn.current = !!profile.email;
  }, [profile.email, disconnect]);

  useEffect(() => closeSocket, [closeSocket]);

  // Baseline poll so liveRelaySessions/isActive (read by ChatScreen's header
  // and AppDrawer on every screen) stay accurate even when the user never
  // visits Code or Remote Session, which run their own faster 5s poll via
  // useRelaySessionPolling while mounted.
  useEffect(() => {
    if (!profile.email) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (AppState.currentState === 'active') {
        await fetchSessionsWithStatus().catch(ignore('remote.backgroundPoll'));
      }
      if (!cancelled) timer = setTimeout(tick, 20000);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [profile.email, fetchSessionsWithStatus]);

  const isActive = ['connecting', 'open', 'attached', 'reconnecting'].includes(
    session.phase,
  );
  const liveRelaySessions = useMemo(
    () => activeRelaySessions.filter(s => s.workerConnected && !s.expired),
    [activeRelaySessions],
  );

  const value = useMemo<RemoteSessionContextValue>(
    () => ({
      session,
      isActive,
      activeRelaySessions,
      liveRelaySessions,
      isLoadingRelaySessions,
      fetchActiveRelaySessions,
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
    }),
    [
      session,
      isActive,
      activeRelaySessions,
      liveRelaySessions,
      isLoadingRelaySessions,
      fetchActiveRelaySessions,
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
    ],
  );

  return (
    <RemoteSessionContext.Provider value={value}>
      <SessionPollingContext.Provider value={fetchSessionsWithStatus}>
        {children}
      </SessionPollingContext.Provider>
    </RemoteSessionContext.Provider>
  );
}

const SessionPollingContext = createContext<
  (() => Promise<{ sessions: ActiveRelaySession[]; status: number }>) | null
>(null);

export function useRemoteSession(): RemoteSessionContextValue {
  const ctx = useContext(RemoteSessionContext);
  if (!ctx)
    throw new Error(
      'useRemoteSession must be used within a RemoteSessionProvider',
    );
  return ctx;
}

/**
 * Poll the relay's session list while a screen shows it: every 5s, backing
 * off to 30s on 401/403, paused while the app is in the background.
 */
export function useRelaySessionPolling(enabled: boolean) {
  const fetchWithStatus = useContext(SessionPollingContext);

  useEffect(() => {
    if (!enabled || !fetchWithStatus) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (AppState.currentState !== 'active') {
        timer = setTimeout(tick, 5000);
        return;
      }
      const { status } = await fetchWithStatus();
      if (cancelled) return;
      timer = setTimeout(tick, status === 401 || status === 403 ? 30000 : 5000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, fetchWithStatus]);
}
