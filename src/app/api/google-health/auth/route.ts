import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getGoogleHealthConfig, resolveRedirectUri } from '@/lib/google-health/config';
import { buildAuthUrl } from '@/lib/google-health/oauth';

export async function GET(req: NextRequest) {
  const { configured } = getGoogleHealthConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error:
          'Google Health is not configured. Set GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET, and JOEBOD_TOKEN_SECRET.',
      },
      { status: 503 },
    );
  }

  const redirectUri = resolveRedirectUri(req.nextUrl.origin);
  const state = randomBytes(16).toString('base64url');
  const res = NextResponse.redirect(buildAuthUrl(state, redirectUri));
  res.cookies.set('joebod_gh_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
