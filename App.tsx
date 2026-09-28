/**
 * Puku AI - Main Application Entry
 * Built with full Flutter-to-React-Native parity
 *
 * @format
 */

import React, { useEffect } from 'react';
import { Platform, StatusBar, Text, View } from 'react-native';
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

function MainNavigator(): React.JSX.Element {
  const { activeRoute, isDark, isRestoringSession } = useApp();

  useEffect(() => {
    try {
      UpdateService.checkForUpdates().catch(() => {});
    } catch {
      // Ignored
    }
  }, []);

  if (isRestoringSession) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F6F4EE',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6F4EE" />
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 16,
            color: '#1A1D18',
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
      <AppDrawer />
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
          <StatusBar barStyle="dark-content" />
          <ChatScreen />
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
