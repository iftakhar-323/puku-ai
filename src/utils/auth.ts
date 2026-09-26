/**
 * Authentication and Token Utilities
 * Handles PKCE generation, JWT payload extraction, and user profile verification.
 */

const B64_MAP: Record<string, number> = {};
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_MAP[B64_CHARS.charAt(i)] = i;
}

/**
 * Decode Base64URL string to JSON object without external dependencies
 */
export function decodeBase64UrlJson(base64Url: string): any {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    let str = '';
    for (let i = 0; i < base64.length; i += 4) {
      const c1 = B64_MAP[base64.charAt(i)] ?? 0;
      const c2 = B64_MAP[base64.charAt(i + 1)] ?? 0;
      const c3 = B64_MAP[base64.charAt(i + 2)] ?? 0;
      const c4 = B64_MAP[base64.charAt(i + 3)] ?? 0;

      const b1 = (c1 << 2) | (c2 >> 4);
      const b2 = ((c2 & 15) << 4) | (c3 >> 2);
      const b3 = ((c3 & 3) << 6) | c4;

      str += String.fromCharCode(b1);
      if (base64.charAt(i + 2) !== '=') str += String.fromCharCode(b2);
      if (base64.charAt(i + 3) !== '=') str += String.fromCharCode(b3);
    }
    return JSON.parse(decodeURIComponent(escape(str)));
  } catch {
    return null;
  }
}

/**
 * Extracts authentic profile data from JWT access_token or id_token
 */
export function extractJwtData(
  token: string
): { email?: string; name?: string; sub?: string; picture?: string } | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  return decodeBase64UrlJson(parts[1]);
}

/**
 * Fetch authenticated user info using Bearer token from official Puku endpoints
 */
export async function fetchAuthenticUserInfo(
  token: string,
  authBaseUrl: string,
  apiBaseUrl: string
): Promise<{ email?: string; name?: string; id?: string; picture?: string; provider?: string } | null> {
  // 1. Try decoding JWT payload directly
  const jwtData = extractJwtData(token);
  if (jwtData && jwtData.email) {
    return {
      email: jwtData.email,
      name: jwtData.name || (jwtData.email ? jwtData.email.split('@')[0] : undefined),
      id: jwtData.sub,
      picture: jwtData.picture,
    };
  }

  // 2. Try official OAuth userinfo endpoint
  try {
    const res = await fetch(`${authBaseUrl}/api/oauth/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.email || data.name)) {
        return {
          email: data.email,
          name: data.name,
          id: data.sub || data.id || data.userId,
          picture: data.picture,
          provider: data.provider,
        };
      }
    }
  } catch {}

  // 3. Try chat API /v1/me endpoint (primary endpoint in Flutter)
  try {
    const res = await fetch(`${apiBaseUrl}/v1/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.email || data.name)) {
        return {
          email: data.email,
          name: data.name,
          id: data.sub || data.id || data.userId,
          picture: data.picture,
          provider: data.provider,
        };
      }
    }
  } catch {}

  return null;
}
