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
    // 200 + ok:false — expected state; avoids Chrome "Failed to load resource" noise
    return NextResponse.json({ ok: false, error: 'Not connected — tap Connect first.' });
  }
  const refresh = decryptToken(sealed);
  if (!refresh) {
    return NextResponse.json({ ok: false, error: 'Invalid session — tap Connect again.' });
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
