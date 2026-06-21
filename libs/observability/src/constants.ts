export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';

export const DEFAULT_LOG_LEVEL = 'info';

export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
] as const;
