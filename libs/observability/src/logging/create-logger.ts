import pino, {
  type DestinationStream,
  type Logger as PinoLogger,
} from 'pino';
import { buildPinoOptions, type LogLevel } from './pino-config.js';

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
  serviceName: string;
  level?: LogLevel | string;
  destination?: DestinationStream;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  return pino(buildPinoOptions(options), options.destination);
}
