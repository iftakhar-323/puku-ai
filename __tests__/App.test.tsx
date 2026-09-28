/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

import { LoginScreen } from '../src/features/login/LoginScreen';
import { ChatScreen } from '../src/features/chat/ChatScreen';
import { AppProvider } from '../src/store/AppContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

test('renders LoginScreen', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <SafeAreaProvider>
        <AppProvider>
          <LoginScreen />
        </AppProvider>
      </SafeAreaProvider>
    );
  });
});

test('renders ChatScreen', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <SafeAreaProvider>
        <AppProvider>
          <ChatScreen />
        </AppProvider>
      </SafeAreaProvider>
    );
  });
});

import { AppDrawer } from '../src/components/common/AppDrawer';

test('renders AppDrawer', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <SafeAreaProvider>
        <AppProvider>
          <AppDrawer />
        </AppProvider>
      </SafeAreaProvider>
    );
  });
});

test('renders App with all contexts', async () => {
  await ReactTestRenderer.act(async () => {
    const rendered = ReactTestRenderer.create(<App />);
    expect(rendered).toBeTruthy();
  });
});
