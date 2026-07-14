import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE, getGoogleHealthConfig, resolveRedirectUri } from '@/lib/google-health/config';
import { encryptToken, exchangeCode } from '@/lib/google-health/oauth';

export async function GET(req: NextRequest) {
  const { configured } = getGoogleHealthConfig();
  const origin = req.nextUrl.origin;
  if (!configured) {
    return NextResponse.redirect(`${origin}/?gh=config`);
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const err = req.nextUrl.searchParams.get('error');
  const savedState = req.cookies.get('joebod_gh_oauth_state')?.value;

  if (err) {
    return NextResponse.redirect(`${origin}/?gh=denied`);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/?gh=state`);
  }

  try {
    const redirectUri = resolveRedirectUri(origin);
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/?gh=norefresh`);
    }
    const sealed = encryptToken(tokens.refresh_token);
    const res = NextResponse.redirect(`${origin}/?gh=connected`);
    res.cookies.set(TOKEN_COOKIE, sealed, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.delete('joebod_gh_oauth_state');
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/?gh=error`);
  }
}
