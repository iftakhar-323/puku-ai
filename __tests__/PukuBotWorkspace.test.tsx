import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { AppProvider, useApp } from '../src/store/AppContext';
import { pukuBotApi } from '../src/services/pukuBotApi';
import { PukuBotWorkspaceSheet, isSharedWithYou } from '../src/features/puku_bot/PukuBotWorkspaceSheet';
import { PukuBotAgent } from '../src/types';

const agent = (over: Partial<PukuBotAgent>): PukuBotAgent => ({
  id: 'a',
  name: 'A',
  title: 't',
  roleDescription: 'r',
  avatarSeed: 'a',
  visibility: 'private',
  mine: false,
  ...over,
});

/** Every Text's content in the tree, flattened. */
function texts(root: ReactTestRenderer.ReactTestInstance): string {
  return root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => [].concat(node.props.children).join(''))
    .join('\n');
}

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<AppProvider>{element}</AppProvider>);
  });
  return tree;
}

describe('Puku Bot Workspace', () => {
  afterEach(() => jest.restoreAllMocks());

  test('"shared with you" means public and not yours, as on the web', () => {
    expect(isSharedWithYou(agent({ mine: false, visibility: 'public' }))).toBe(true);
    expect(isSharedWithYou(agent({ mine: true, visibility: 'public' }))).toBe(false);
    expect(isSharedWithYou(agent({ mine: false, visibility: 'private' }))).toBe(false);
  });

  test('Agents splits your agents from the ones shared with you, and Chat hands the Bot over', async () => {
    jest.spyOn(pukuBotApi, 'getAgents').mockResolvedValue([
      agent({ id: 'mine-1', name: 'Bug Reproducer (copy)', mine: true }),
      agent({ id: 'pub-1', name: 'General Assistant', visibility: 'public' }),
    ]);
    const onStartChat = jest.fn();
    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="agents" onChangePanel={jest.fn()} onClose={jest.fn()} onStartChat={onStartChat} />
    );
    const shown = texts(tree.root);
    expect(shown).toContain('Your agents');
    expect(shown).toContain('Bug Reproducer (copy)');
    expect(shown).toContain('Explore agents');
    expect(shown).toContain('General Assistant');

    const chat = tree.root.find(n => n.props.accessibilityLabel === 'Chat with General Assistant');
    await ReactTestRenderer.act(async () => chat.props.onPress());
    expect(onStartChat).toHaveBeenCalledWith('pub-1');
  });

  test('Agents says so when it could not load, instead of claiming there are none', async () => {
    jest.spyOn(pukuBotApi, 'getAgents').mockRejectedValue(new Error('down'));
    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="agents" onChangePanel={jest.fn()} onClose={jest.fn()} onStartChat={jest.fn()} />
    );
    expect(texts(tree.root)).toContain("Your agents couldn't be loaded.");
  });

  test('Marketplace lists templates, filters by category and installs after confirming', async () => {
    const getMarketplace = jest.spyOn(pukuBotApi, 'getMarketplace').mockResolvedValue([
      {
        agentId: 't1',
        name: 'PR Reviewer',
        title: 'Code Review',
        roleDescription: '',
        avatarSeed: 't1',
        category: 'engineering',
        blurb: 'Reviews one diff.',
        authorName: null,
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]);
    const install = jest
      .spyOn(pukuBotApi, 'installTemplate')
      .mockResolvedValue(agent({ id: 'installed-1', name: 'PR Reviewer', mine: true }));
    const alert = jest.spyOn(Alert, 'alert');

    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="marketplace" onChangePanel={jest.fn()} onClose={jest.fn()} onStartChat={jest.fn()} />
    );
    expect(texts(tree.root)).toContain('PR Reviewer');
    expect(texts(tree.root)).toContain('Engineering');
    expect(getMarketplace).toHaveBeenLastCalledWith(undefined);

    const sales = tree.root.find(
      n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && texts(n) === 'Sales'
    );
    await ReactTestRenderer.act(async () => sales.props.onPress());
    expect(getMarketplace).toHaveBeenLastCalledWith('sales');

    // Installing asks first; only the confirmation installs.
    await ReactTestRenderer.act(async () => {
      tree.root.find(n => n.props.accessibilityLabel === 'Install PR Reviewer').props.onPress();
    });
    expect(install).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as Array<{ text: string; onPress?: () => Promise<void> }>;
    await ReactTestRenderer.act(async () => {
      await buttons.find(b => b.text === 'Install')!.onPress!();
    });
    expect(install).toHaveBeenCalledWith('t1');
  });

  test('the drawer asks the Bot screen to open a Workspace panel', async () => {
    let app: ReturnType<typeof useApp> | null = null;
    function Probe() {
      app = useApp();
      return null;
    }
    await render(<Probe />);
    expect(app!.botWorkspaceRequest).toBeNull();
    await ReactTestRenderer.act(async () => app!.openBotWorkspace('marketplace'));
    expect(app!.botWorkspaceRequest?.panel).toBe('marketplace');
    const first = app!.botWorkspaceRequest!.at;
    await new Promise<void>(r => setTimeout(() => r(), 2));
    // Tapping the same entry again is a new request.
    await ReactTestRenderer.act(async () => app!.openBotWorkspace('marketplace'));
    expect(app!.botWorkspaceRequest!.at).not.toBe(first);
  });
});
