import { context, trace } from '@opentelemetry/api';
import pino, { type LoggerOptions } from 'pino';
import {
  DEFAULT_LOG_LEVEL,
  PINO_REDACT_PATHS,
} from '../constants.js';
import { RequestContext } from '../context/request-context.js';

export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export interface PinoConfigOptions {
  serviceName: string;
  level?: LogLevel | string;
}

export function buildPinoOptions(options: PinoConfigOptions): LoggerOptions {
  return {
    level: options.level ?? process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
    base: { service: options.serviceName },
    redact: {
      paths: [...PINO_REDACT_PATHS],
      censor: '[REDACTED]',
    },
    mixin() {
      const span = trace.getSpan(context.active());
      const spanContext = span?.spanContext();
      const correlationId = RequestContext.correlationId();

      return {
        ...(correlationId ? { correlationId } : {}),
        ...(spanContext?.traceId ? { traceId: spanContext.traceId } : {}),
        ...(spanContext?.spanId ? { spanId: spanContext.spanId } : {}),
      };
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };
}
