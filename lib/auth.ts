// Web Crypto HMAC — works in both Node.js 18+ and the Edge runtime
export const COOKIE_NAME = 'ironlog_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function b64url(data: Uint8Array): string {
  let bin = '';
  data.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signToken(secret: string): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify({ ts: Date.now() }));
  const key = await getKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload));
  return `${b64url(payload)}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 1) return false;
    const payloadBytes = fromB64url(token.slice(0, dot));
    const sigBytes = fromB64url(token.slice(dot + 1));
    const key = await getKey(secret);
    return crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
  } catch {
    return false;
  }
}
