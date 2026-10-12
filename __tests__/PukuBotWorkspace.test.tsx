import React from 'react';
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
    const onUseAgent = jest.fn();
    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="agents" onChangePanel={jest.fn()} onClose={jest.fn()} onUseAgent={onUseAgent} />
    );
    const shown = texts(tree.root);
    expect(shown).toContain('Your agents');
    expect(shown).toContain('Bug Reproducer (copy)');
    expect(shown).toContain('Explore agents');
    expect(shown).toContain('General Assistant');

    const use = tree.root.find(n => n.props.accessibilityLabel === 'Use General Assistant in chat');
    await ReactTestRenderer.act(async () => use.props.onPress());
    expect(onUseAgent).toHaveBeenCalledWith(expect.objectContaining({ id: 'pub-1', name: 'General Assistant' }));
  });

  test('Agents says so when it could not load, instead of claiming there are none', async () => {
    jest.spyOn(pukuBotApi, 'getAgents').mockRejectedValue(new Error('down'));
    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="agents" onChangePanel={jest.fn()} onClose={jest.fn()} onUseAgent={jest.fn()} />
    );
    expect(texts(tree.root)).toContain("Your agents couldn't be loaded.");
  });

  test('Marketplace lists templates, filters by category, installs on a tap with progress', async () => {
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
    let finishInstall!: (a: PukuBotAgent) => void;
    const install = jest
      .spyOn(pukuBotApi, 'installTemplate')
      .mockImplementation(() => new Promise<PukuBotAgent>(resolve => (finishInstall = resolve)));
    const onUseAgent = jest.fn();

    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="marketplace" onChangePanel={jest.fn()} onClose={jest.fn()} onUseAgent={onUseAgent} />
    );
    expect(texts(tree.root)).toContain('PR Reviewer');
    expect(texts(tree.root)).toContain('Engineering');
    expect(getMarketplace).toHaveBeenLastCalledWith(undefined);

    const sales = tree.root.find(
      n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && texts(n) === 'Sales'
    );
    await ReactTestRenderer.act(async () => sales.props.onPress());
    expect(getMarketplace).toHaveBeenLastCalledWith('sales');

    // A tap installs straight away and shows how far it has got.
    await ReactTestRenderer.act(async () => {
      tree.root.find(n => n.props.accessibilityLabel === 'Install PR Reviewer').props.onPress();
    });
    expect(install).toHaveBeenCalledWith('t1');
    expect(texts(tree.root)).toMatch(/Installing… \d+%/);
    const bar = tree.root.find(n => n.props.accessibilityRole === 'progressbar');
    expect(bar.props.accessibilityValue.now).toBeLessThan(100);

    await ReactTestRenderer.act(async () => finishInstall(agent({ id: 'installed-1', name: 'PR Reviewer', mine: true })));
    expect(texts(tree.root)).toContain('Installed · added to your agents. Tap to use it in chat.');
    expect(tree.root.find(n => n.props.accessibilityRole === 'progressbar').props.accessibilityValue.now).toBe(100);

    // Then the same card puts the new Bot to work in the chat.
    await ReactTestRenderer.act(async () => {
      tree.root.find(n => n.props.accessibilityLabel === 'Use PR Reviewer in chat').props.onPress();
    });
    expect(onUseAgent).toHaveBeenCalledWith(expect.objectContaining({ id: 'installed-1' }));
    expect(install).toHaveBeenCalledTimes(1);
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
    // Once the Bot screen has opened it, it is gone, so a later visit opens nothing.
    await ReactTestRenderer.act(async () => app!.clearBotWorkspaceRequest());
    expect(app!.botWorkspaceRequest).toBeNull();
  });

  test('the drawer lists the real Bots, and an explicit pick is its own signal', async () => {
    let app: ReturnType<typeof useApp> | null = null;
    function Probe() {
      app = useApp();
      return null;
    }
    await render(<Probe />);
    await ReactTestRenderer.act(async () =>
      app!.setAvailableBots([{ id: 'research-desk', name: 'Research Desk' }])
    );
    expect(app!.availableBots.map(b => b.id)).toEqual(['research-desk']);

    // Opening a conversation does not count as picking its Bot.
    expect(app!.botPick).toBeNull();
    await ReactTestRenderer.act(async () => app!.selectBot('research-desk'));
    expect(app!.botPick?.botId).toBe('research-desk');
    expect(app!.activeBotId).toBe('research-desk');
  });

  test('tapping an agent card or a template card does what its button does', async () => {
    jest.spyOn(pukuBotApi, 'getAgents').mockResolvedValue([agent({ id: 'mine-1', name: 'Nova', mine: true })]);
    const onUseAgent = jest.fn();
    const tree = await render(
      <PukuBotWorkspaceSheet visible panel="agents" onChangePanel={jest.fn()} onClose={jest.fn()} onUseAgent={onUseAgent} />
    );
    const card = tree.root.find(n => n.props.accessibilityHint === 'Adds this agent to your chat');
    await ReactTestRenderer.act(async () => card.props.onPress());
    expect(onUseAgent).toHaveBeenCalledWith(expect.objectContaining({ id: 'mine-1' }));

    jest.spyOn(pukuBotApi, 'getMarketplace').mockResolvedValue([
      {
        agentId: 't9',
        name: 'Release Notes',
        title: 't',
        roleDescription: '',
        avatarSeed: 't9',
        category: 'product',
        blurb: 'b',
        authorName: null,
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]);
    const install = jest.spyOn(pukuBotApi, 'installTemplate').mockResolvedValue(agent({ id: 'n1', mine: true }));
    const market = await render(
      <PukuBotWorkspaceSheet visible panel="marketplace" onChangePanel={jest.fn()} onClose={jest.fn()} onUseAgent={jest.fn()} />
    );
    const tplCard = market.root.find(n => n.props.accessibilityHint === 'Installs this template');
    await ReactTestRenderer.act(async () => tplCard.props.onPress());
    expect(install).toHaveBeenCalledWith('t9');
  });
});
