import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TOKEN_COOKIE, getGoogleHealthConfig } from '@/lib/google-health/config';
import { decryptToken } from '@/lib/google-health/oauth';

export async function GET() {
  const { configured } = getGoogleHealthConfig();
  const jar = await cookies();
  const sealed = jar.get(TOKEN_COOKIE)?.value;
  const connected = Boolean(configured && sealed && decryptToken(sealed));
  return NextResponse.json({ configured, connected });
}
