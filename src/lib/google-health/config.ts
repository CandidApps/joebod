export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.profile.readonly',
].join(' ');

export const TOKEN_COOKIE = 'joebod_gh_rt';

export function getGoogleHealthConfig() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET ?? '';
  const redirectUriEnv = process.env.GOOGLE_HEALTH_REDIRECT_URI ?? '';
  const tokenSecret = process.env.JOEBOD_TOKEN_SECRET ?? '';
  // Redirect URI can be derived from the request origin; env is optional override.
  const configured = Boolean(clientId && clientSecret && tokenSecret);
  return { clientId, clientSecret, redirectUriEnv, tokenSecret, configured };
}

/** Prefer current site origin so localhost / production both work. */
export function resolveRedirectUri(origin: string): string {
  const { redirectUriEnv } = getGoogleHealthConfig();
  if (redirectUriEnv) {
    try {
      const envOrigin = new URL(redirectUriEnv).origin;
      // Only force env redirect when it matches this request (avoids sending
      // localhost Connect to a stale Vercel preview URL).
      if (envOrigin === origin) return redirectUriEnv;
    } catch {
      // fall through
    }
  }
  return `${origin.replace(/\/$/, '')}/api/google-health/callback`;
}
