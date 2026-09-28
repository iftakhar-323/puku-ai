import { UpdateService } from '../src/services/updateService';
import * as Updates from 'expo-updates';

jest.mock('expo-updates', () => ({
  isEnabled: false,
  isEmbeddedLaunch: true,
  checkForUpdateAsync: jest.fn().mockResolvedValue({ isAvailable: false }),
  fetchUpdateAsync: jest.fn().mockResolvedValue({ isNew: false }),
  reloadAsync: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(),
  channel: 'production',
  updateId: 'test-id',
  runtimeVersion: '1.0.0',
}));

describe('UpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs checkForUpdates gracefully', async () => {
    const result = await UpdateService.checkForUpdates();
    expect(result).toBe(false);
  });

  it('fetches update when available', async () => {
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({ isAvailable: true });
    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValueOnce({ isNew: true });

    const result = await UpdateService.manualCheckForUpdate();
    expect(result).toBe(true);
    expect(Updates.checkForUpdateAsync).toHaveBeenCalled();
  });

  it('returns current update info', () => {
    const info = UpdateService.getUpdateInfo();
    expect(info).toHaveProperty('channel');
    expect(info).toHaveProperty('updateId');
  });
});
