import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE, getGoogleHealthConfig } from '@/lib/google-health/config';
import { decryptToken, encryptToken, refreshAccessToken } from '@/lib/google-health/oauth';
import { fetchHealthSnapshot } from '@/lib/google-health/client';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function setRefreshCookie(res: NextResponse, refreshToken: string) {
  res.cookies.set(TOKEN_COOKIE, encryptToken(refreshToken), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function POST(req: NextRequest) {
  const { configured } = getGoogleHealthConfig();
  if (!configured) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const jar = await cookies();
  const sealed = jar.get(TOKEN_COOKIE)?.value;
  if (!sealed) {
    return NextResponse.json({ ok: false, error: 'Not connected — tap Connect first.' });
  }
  const refresh = decryptToken(sealed);
  if (!refresh) {
    const res = NextResponse.json({
      ok: false,
      reconnect: true,
      error: 'Invalid session — tap Connect again.',
    });
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }

  let civilDate: string | undefined;
  try {
    const body = (await req.json()) as { civilDate?: string };
    if (typeof body?.civilDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.civilDate)) {
      civilDate = body.civilDate;
    }
  } catch {
    // empty body is fine
  }

  try {
    const tokens = await refreshAccessToken(refresh);
    const { snapshot, meta } = await fetchHealthSnapshot(tokens.access_token, { civilDate });
    const res = NextResponse.json({
      ok: true,
      snapshot,
      meta,
      updatedAt: new Date().toISOString(),
    });
    setRefreshCookie(res, tokens.refresh_token ?? refresh);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    const needsReconnect = /refresh failed|invalid_grant|401|403/i.test(message);
    const res = NextResponse.json(
      {
        ok: false,
        reconnect: needsReconnect,
        error: needsReconnect
          ? 'Google session expired — tap Connect once to renew.'
          : message,
      },
      { status: needsReconnect ? 401 : 502 },
    );
    if (needsReconnect) res.cookies.delete(TOKEN_COOKIE);
    return res;
  }
}
