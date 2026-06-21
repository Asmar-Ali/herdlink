import { describe, expect, it } from '@jest/globals';
import { RequestContext } from '../context/request-context.js';
import { createCaptureStream } from '../testing/log-capture.js';
import { createLogger } from './create-logger.js';

describe('createLogger', () => {
  it('writes JSON with service and correlationId', () => {
    const capture = createCaptureStream();
    const logger = createLogger({
      serviceName: 'mqtt-bridge',
      destination: capture.stream,
    });

    RequestContext.run({ correlationId: 'corr-1', startedAt: 1 }, () => {
      logger.info('connected');
    });

    expect(capture.lastLine()).toMatchObject({
      service: 'mqtt-bridge',
      correlationId: 'corr-1',
      msg: 'connected',
    });
  });
});
