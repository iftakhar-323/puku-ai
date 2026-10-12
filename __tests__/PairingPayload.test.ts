import { parsePairingPayload } from '../src/features/remote_session/relay/pairing';

describe('parsePairingPayload', () => {
  test('parses a URI with short query params', () => {
    expect(parsePairingPayload('puku://pair?s=abc-123&t=secret-token')).toEqual({
      sessionId: 'abc-123',
      token: 'secret-token',
    });
  });

  test('parses a URI with long-form query params', () => {
    expect(
      parsePairingPayload('https://puku.sh/pair?sessionId=abc-123&token=secret-token'),
    ).toEqual({ sessionId: 'abc-123', token: 'secret-token' });
  });

  test('parses a JSON object with short keys', () => {
    expect(parsePairingPayload('{"s":"abc-123","t":"secret-token"}')).toEqual({
      sessionId: 'abc-123',
      token: 'secret-token',
    });
  });

  test('parses a JSON object with long keys', () => {
    expect(
      parsePairingPayload('{"sessionId":"abc-123","token":"secret-token"}'),
    ).toEqual({ sessionId: 'abc-123', token: 'secret-token' });
  });

  test('parses a bare key=value list', () => {
    expect(parsePairingPayload('sessionId=abc-123&token=secret-token')).toEqual({
      sessionId: 'abc-123',
      token: 'secret-token',
    });
  });

  test('parses key=value pairs separated by newlines', () => {
    expect(parsePairingPayload('s=abc-123\nt=secret-token')).toEqual({
      sessionId: 'abc-123',
      token: 'secret-token',
    });
  });

  test('returns null for empty input', () => {
    expect(parsePairingPayload('')).toBeNull();
    expect(parsePairingPayload('   ')).toBeNull();
  });

  test('returns null when token is missing', () => {
    expect(parsePairingPayload('sessionId=abc-123')).toBeNull();
  });

  test('returns null for unrelated text', () => {
    expect(parsePairingPayload('not a pairing code')).toBeNull();
  });
});
