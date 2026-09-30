/**
 * Puku AI - Main Application Entry
 * Built with full Flutter-to-React-Native parity
 *
 * @format
 */

import React, { useEffect } from 'react';
import { Linking, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDrawer } from './src/components/common/AppDrawer';
import { ArtifactsScreen } from './src/features/artifacts/ArtifactsScreen';
import { ChatScreen } from './src/features/chat/ChatScreen';
import { ChatsScreen } from './src/features/chats/ChatsScreen';
import { CodeScreen } from './src/features/code/CodeScreen';
import { LiveVoiceScreen } from './src/features/live_voice/LiveVoiceScreen';
import { LoginScreen } from './src/features/login/LoginScreen';
import { ProfileScreen } from './src/features/settings/ProfileScreen';
import { ProjectDetailsScreen } from './src/features/projects/ProjectDetailsScreen';
import { ProjectsScreen } from './src/features/projects/ProjectsScreen';
import { PukuBotScreen } from './src/features/puku_bot/PukuBotScreen';
import { RemoteSessionScreen } from './src/features/remote_session/RemoteSessionScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { UsageScreen } from './src/features/settings/UsageScreen';
import { TranscribeScreen } from './src/features/transcribe/TranscribeScreen';
import { AppProvider, useApp } from './src/store/AppContext';
import { ToastProvider } from './src/components/ui/Toast';
import { UpdateService } from './src/services/updateService';
import { pukuBotApi } from './src/services/pukuBotApi';

function MainNavigator(): React.JSX.Element {
  const { activeRoute, isDark, isRestoringSession, navigate } = useApp();

  useEffect(() => {
    try {
      UpdateService.checkForUpdates(false).catch(() => {});
    } catch {
      // Ignored
    }

    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      if (url.startsWith('pukubot://')) {
        try {
          await pukuBotApi.handleAuthCallback(url);
          navigate('pukuBot');
        } catch (e) {
          console.warn('[PukuBot] Deep link auth callback failed:', e);
        }
      }
    };

    const sub = Linking.addEventListener('url', event => {
      handleDeepLink(event.url);
    });

    Linking.getInitialURL().then(initialUrl => {
      if (initialUrl) handleDeepLink(initialUrl);
    });

    return () => {
      sub.remove();
    };
  }, [navigate]);

  if (isRestoringSession) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <StatusBar barStyle="light-content" />
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 16,
            color: '#FFFFFF',
            letterSpacing: -0.2,
          }}>
          Opening workspace...
        </Text>
      </View>
    );
  }


  const renderScreen = () => {
    switch (activeRoute) {
      case 'chat':
        return <ChatScreen />;
      case 'chats':
        return <ChatsScreen />;
      case 'projects':
        return <ProjectsScreen />;
      case 'projectDetails':
        return <ProjectDetailsScreen />;
      case 'artifacts':
        return <ArtifactsScreen />;
      case 'code':
        return <CodeScreen />;
      case 'pukuBot':
        return <PukuBotScreen />;
      case 'remoteSession':
        return <RemoteSessionScreen />;
      case 'transcribe':
        return <TranscribeScreen />;
      case 'liveVoice':
        return <LiveVoiceScreen />;
      case 'settings':
      case 'profile':
        return <ProfileScreen />;
      case 'usage':
        return <UsageScreen />;
      case 'login':
        return <LoginScreen />;
      default:
        return <ChatScreen />;
    }
  };

  return (
    <>
      <StatusBar
        barStyle={isDark || activeRoute === 'liveVoice' ? 'light-content' : 'dark-content'}
      />
      {renderScreen()}
      {activeRoute !== 'login' && <AppDrawer />}
    </>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <View
            style={{
              flex: 1,
              backgroundColor: '#000000',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: 8,
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              }}>
              Something went wrong
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#6F736D',
                textAlign: 'center',
                marginBottom: 20,
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity
              onPress={() => this.setState({ hasError: false, error: null })}
              style={{
                backgroundColor: '#1A1D18',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
              }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                }}>
                Reload Workspace
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <ToastProvider>
            <MainNavigator />
          </ToastProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
