/**
 * Puku AI - Main Application Entry
 * Built with full Flutter-to-React-Native parity
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
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
import { RemoteSessionScreen } from './src/features/remote_session/RemoteSessionScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { TranscribeScreen } from './src/features/transcribe/TranscribeScreen';
import { AppProvider, useApp } from './src/store/AppContext';

function MainNavigator(): React.JSX.Element {
  const { activeRoute, isDark } = useApp();

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
      case 'remoteSession':
        return <RemoteSessionScreen />;
      case 'transcribe':
        return <TranscribeScreen />;
      case 'liveVoice':
        return <LiveVoiceScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'profile':
        return <ProfileScreen />;
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
          <MainNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
