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
import { ArtifactsScreen } from './src/screens/ArtifactsScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ChatsScreen } from './src/screens/ChatsScreen';
import { CodeScreen } from './src/screens/CodeScreen';
import { LiveVoiceScreen } from './src/screens/LiveVoiceScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ProjectDetailsScreen } from './src/screens/ProjectDetailsScreen';
import { ProjectsScreen } from './src/screens/ProjectsScreen';
import { RemoteSessionScreen } from './src/screens/RemoteSessionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TranscribeScreen } from './src/screens/TranscribeScreen';
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

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default App;
