export function getCoachConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
  const configured = Boolean(apiKey.trim());
  return { apiKey: apiKey.trim(), model, configured };
}
