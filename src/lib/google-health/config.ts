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
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI ?? '';
  const tokenSecret = process.env.JOEBOD_TOKEN_SECRET ?? '';
  const configured = Boolean(clientId && clientSecret && redirectUri && tokenSecret);
  return { clientId, clientSecret, redirectUri, tokenSecret, configured };
}
