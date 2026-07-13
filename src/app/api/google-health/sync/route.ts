import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TOKEN_COOKIE, getGoogleHealthConfig } from '@/lib/google-health/config';
import { decryptToken, refreshAccessToken } from '@/lib/google-health/oauth';
import { fetchHealthSnapshot } from '@/lib/google-health/client';

export async function POST() {
  const { configured } = getGoogleHealthConfig();
  if (!configured) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const jar = await cookies();
  const sealed = jar.get(TOKEN_COOKIE)?.value;
  if (!sealed) {
    return NextResponse.json({ error: 'Not connected' }, { status: 401 });
  }
  const refresh = decryptToken(sealed);
  if (!refresh) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const tokens = await refreshAccessToken(refresh);
    const snapshot = await fetchHealthSnapshot(tokens.access_token);
    return NextResponse.json({
      ok: true,
      snapshot,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 502 },
    );
  }
}
