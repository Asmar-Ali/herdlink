import { Writable } from 'node:stream';
import pino, { type DestinationStream } from 'pino';
import { buildPinoOptions } from '../logging/pino-config.js';

export function createCaptureStream(): {
  stream: DestinationStream;
  lines: string[];
  lastLine(): Record<string, unknown>;
} {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  }) as DestinationStream;

  return {
    stream,
    lines,
    lastLine() {
      const raw = lines.at(-1);
      if (!raw) {
        throw new Error('no log lines captured');
      }
      return JSON.parse(raw) as Record<string, unknown>;
    },
  };
}

export function createCapturingLogger(
  serviceName: string,
  level = 'info',
): {
  logger: pino.Logger;
  lastLine: () => Record<string, unknown>;
} {
  const capture = createCaptureStream();
  const logger = pino(buildPinoOptions({ serviceName, level }), capture.stream);

  return {
    logger,
    lastLine: capture.lastLine,
  };
}
