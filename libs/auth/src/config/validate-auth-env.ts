export function validateAuthEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const secret = config.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('Missing or empty required env: JWT_SECRET');
  }

  return config;
}
