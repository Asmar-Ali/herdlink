import type { LogLevel } from '../logging/pino-config.js';

export interface ObservabilityOptions {
  serviceName: string;
  serviceVersion?: string;
  logLevel?: LogLevel | string;
  otlpEndpoint?: string;
  tracingEnabled?: boolean;
}
