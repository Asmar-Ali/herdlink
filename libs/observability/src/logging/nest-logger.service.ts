import type { LoggerService } from '@nestjs/common';
import { createLogger, type CreateLoggerOptions } from './create-logger.js';

export function createNestLogger(
  options: CreateLoggerOptions,
): LoggerService {
  const logger = createLogger(options);

  return {
    log(message: unknown, context?: string) {
      logger.info({ context }, String(message));
    },
    error(message: unknown, trace?: string, context?: string) {
      logger.error({ context, trace }, String(message));
    },
    warn(message: unknown, context?: string) {
      logger.warn({ context }, String(message));
    },
    debug(message: unknown, context?: string) {
      logger.debug({ context }, String(message));
    },
    verbose(message: unknown, context?: string) {
      logger.trace({ context }, String(message));
    },
  };
}
