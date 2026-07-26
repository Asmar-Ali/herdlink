const REQUIRED_STRING = [
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'MONGODB_URI',
  'JWT_SECRET',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED_STRING) {
    const value = config[key];
    if (value === undefined || value === '') {
      throw new Error(`Missing or empty required env: ${key}`);
    }
  }

  return config;
}
