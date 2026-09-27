import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppProvider, useApp } from '../src/store/AppContext';
import { pukuApi } from '../src/services/api';

jest.mock('../src/services/api');

function TestConsumer({
  onRender,
}: {
  onRender: (app: ReturnType<typeof useApp>) => void;
}) {
  const app = useApp();
  onRender(app);
  return null;
}

describe('Incognito / Temporary Chat Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('isolates temporary messages from persistent conversations', async () => {
    let appState: ReturnType<typeof useApp> | null = null;

    (pukuApi.generateResponse as jest.Mock).mockResolvedValueOnce({
      text: 'Ephemeral answer',
      model: 'puku-ai-2.7',
      conversationId: 'server_incog_123',
    });

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <AppProvider>
          <TestConsumer onRender={app => (appState = app)} />
        </AppProvider>
      );
    });

    expect(appState).not.toBeNull();

    // Toggle incognito mode ON
    await ReactTestRenderer.act(async () => {
      appState!.setIncognito(true);
    });

    expect(appState!.isIncognito).toBe(true);
    expect(appState!.incognitoMessages).toEqual([]);

    // Send a message in incognito mode
    await ReactTestRenderer.act(async () => {
      await appState!.sendMessage('Hello in incognito');
    });

    // Check that incognitoMessages has user and assistant messages
    expect(appState!.incognitoMessages.length).toBe(2);
    expect(appState!.incognitoMessages[0].content).toBe('Hello in incognito');
    expect(appState!.incognitoMessages[1].content).toBe('Ephemeral answer');

    // Check that standard persistent conversations remains empty
    expect(appState!.conversations.length).toBe(0);

    // Toggle incognito mode OFF
    await ReactTestRenderer.act(async () => {
      appState!.setIncognito(false);
    });

    expect(appState!.isIncognito).toBe(false);
    // Incognito messages should now be wiped clean
    expect(appState!.incognitoMessages.length).toBe(0);
    // Standard conversations remains empty
    expect(appState!.conversations.length).toBe(0);
  });
});
