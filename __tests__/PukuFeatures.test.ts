import { pukuApi } from '../src/services/api';

describe('Puku API Extended Endpoints & Contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pukuApi has project REST endpoints defined', () => {
    expect(typeof pukuApi.fetchProjects).toBe('function');
    expect(typeof pukuApi.createProject).toBe('function');
    expect(typeof pukuApi.updateProject).toBe('function');
    expect(typeof pukuApi.deleteProject).toBe('function');
  });

  test('pukuApi has audio transcription endpoint defined', () => {
    expect(typeof pukuApi.transcribeAudio).toBe('function');
  });

  test('pukuApi has conversation sync & delete endpoints defined', () => {
    expect(typeof pukuApi.fetchConversations).toBe('function');
    expect(typeof pukuApi.fetchConversation).toBe('function');
    expect(typeof pukuApi.deleteConversation).toBe('function');
  });

  test('fetchProjects returns empty array when unauthenticated/offline', async () => {
    pukuApi.setAuthToken(null);
    const projects = await pukuApi.fetchProjects();
    expect(Array.isArray(projects)).toBe(true);
  });

  test('transcribeAudio handles missing response gracefully', async () => {
    pukuApi.setAuthToken(null);
    const result = await pukuApi.transcribeAudio('dummy_audio_base64');
    expect(result).toBeNull();
  });
});
