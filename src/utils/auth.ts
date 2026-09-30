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
 * Standard pure JS SHA-256 implementation
 */
export function sha256(ascii: string): Uint8Array {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  let i, j;
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClearLength = ((asciiBitLength + 64 >>> 9) << 4) + 15;
  while (words.length <= compositeClearLength) {
    words.push(0);
  }
  for (i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 255) << 8 * (3 - (i % 4));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[compositeClearLength] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w: number[] = [];
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = ((w[j - 16] + s0 + w[j - 7] + s1) & 0xffffffff) >>> 0;
      }
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = ((h + S1 + ch + k[j] + w[j]) & 0xffffffff) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = ((S0 + maj) & 0xffffffff) >>> 0;

      h = g; g = f; f = e;
      e = ((d + temp1) & 0xffffffff) >>> 0;
      d = c; c = b; b = a;
      a = ((temp1 + temp2) & 0xffffffff) >>> 0;
    }

    hash[0] = ((hash[0] + a) & 0xffffffff) >>> 0;
    hash[1] = ((hash[1] + b) & 0xffffffff) >>> 0;
    hash[2] = ((hash[2] + c) & 0xffffffff) >>> 0;
    hash[3] = ((hash[3] + d) & 0xffffffff) >>> 0;
    hash[4] = ((hash[4] + e) & 0xffffffff) >>> 0;
    hash[5] = ((hash[5] + f) & 0xffffffff) >>> 0;
    hash[6] = ((hash[6] + g) & 0xffffffff) >>> 0;
    hash[7] = ((hash[7] + h) & 0xffffffff) >>> 0;
  }

  const out = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    out[i * 4] = (hash[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hash[i] & 0xff;
  }
  return out;
}

/**
 * Base64URL string encoder (RFC 7636 compliant, no padding)
 */
export function toBase64Url(bytes: Uint8Array): string {
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;

    base64 += B64_CHARS.charAt(c1) + B64_CHARS.charAt(c2);
    if (i + 1 < len) base64 += B64_CHARS.charAt(c3);
    if (i + 2 < len) base64 += B64_CHARS.charAt(c4);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generates a random alphanumeric string for PKCE verifiers & state
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Generates a full PKCE Code Verifier, Code Challenge, and State
 */
export function generatePkcePair() {
  const verifier = generateRandomString(64);
  const challengeBytes = sha256(verifier);
  const challenge = toBase64Url(challengeBytes);
  const state = generateRandomString(32);
  return { verifier, challenge, state };
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
