import { describe, expect, it } from '@jest/globals';
import { createCaptureStream } from '../testing/log-capture.js';
import { createNestLogger } from './nest-logger.service.js';

describe('createNestLogger', () => {
  it('maps Nest log levels to Pino levels', () => {
    const capture = createCaptureStream();
    const nestLogger = createNestLogger({
      serviceName: 'device-service',
      level: 'trace',
      destination: capture.stream,
    });

    nestLogger.log('booting', 'Bootstrap');
    nestLogger.verbose('detail', 'Bootstrap');
    nestLogger.warn('retrying', 'Kafka');
    nestLogger.debug('pool size', 'Database');
    nestLogger.error('failed', 'stack-trace', 'Bootstrap');

    const lines = capture.lines.map(
      (line) => JSON.parse(line) as Record<string, unknown>,
    );

    expect(lines[0]).toMatchObject({
      level: 'info',
      msg: 'booting',
      context: 'Bootstrap',
      service: 'device-service',
    });
    expect(lines[1]).toMatchObject({
      level: 'trace',
      msg: 'detail',
      context: 'Bootstrap',
    });
    expect(lines[2]).toMatchObject({ level: 'warn', msg: 'retrying' });
    expect(lines[3]).toMatchObject({ level: 'debug', msg: 'pool size' });
    expect(lines[4]).toMatchObject({
      level: 'error',
      msg: 'failed',
      trace: 'stack-trace',
      context: 'Bootstrap',
    });
  });
});
