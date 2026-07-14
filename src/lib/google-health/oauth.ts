import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getGoogleHealthConfig, GOOGLE_HEALTH_SCOPES } from '@/lib/google-health/config';

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(plain: string): string {
  const { tokenSecret } = getGoogleHealthConfig();
  const key = keyFromSecret(tokenSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptToken(payload: string): string | null {
  try {
    const { tokenSecret } = getGoogleHealthConfig();
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = keyFromSecret(tokenSecret);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

export function buildAuthUrl(state: string, redirectUri: string): string {
  const { clientId } = getGoogleHealthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    scope: GOOGLE_HEALTH_SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getGoogleHealthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getGoogleHealthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}
