import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { trace } from '@opentelemetry/api';
import type { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { RequestContext } from '../context/request-context.js';
import { createCapturingLogger } from '../testing/log-capture.js';
import {
  setupOtelContextForTests,
  teardownOtelContextForTests,
} from '../testing/setup-otel-context.js';
import { buildPinoOptions } from './pino-config.js';

describe('buildPinoOptions', () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    ({ provider } = setupOtelContextForTests());
  });

  afterEach(async () => {
    await teardownOtelContextForTests(provider);
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it('sets the service name on every log line', () => {
    const options = buildPinoOptions({ serviceName: 'mqtt-bridge' });
    expect(options.base).toEqual({ service: 'mqtt-bridge' });
  });

  it('respects LOG_LEVEL env', () => {
    process.env.LOG_LEVEL = 'warn';
    const options = buildPinoOptions({ serviceName: 'test-service' });
    expect(options.level).toBe('warn');
  });

  it('includes correlationId from RequestContext in the mixin', () => {
    const options = buildPinoOptions({ serviceName: 'test-service' });

    RequestContext.run({ correlationId: 'corr-42', startedAt: 1 }, () => {
      const mixin = options.mixin?.(
        undefined as never,
        0,
        undefined as never,
      );
      expect(mixin).toEqual(
        expect.objectContaining({ correlationId: 'corr-42' }),
      );
    });
  });

  it('omits correlationId outside RequestContext', () => {
    const options = buildPinoOptions({ serviceName: 'test-service' });
    const mixin = options.mixin?.(undefined as never, 0, undefined as never);
    expect(mixin).not.toHaveProperty('correlationId');
  });

  it('includes traceId and spanId when a span is active', () => {
    const tracer = trace.getTracer('test');

    tracer.startActiveSpan('active-span', (span) => {
      const { logger, lastLine } = createCapturingLogger('test-service');
      logger.info('inside span');

      const spanContext = span.spanContext();
      expect(lastLine()).toEqual(
        expect.objectContaining({
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
          msg: 'inside span',
        }),
      );
      span.end();
    });
  });

  it('redacts sensitive fields in output', () => {
    const { logger, lastLine } = createCapturingLogger('test-service');
    logger.info({ password: 'secret-value' }, 'credential check');
    expect(lastLine().password).toBe('[REDACTED]');
  });

  it('configures redaction paths', () => {
    const options = buildPinoOptions({ serviceName: 'test-service' });
    expect(options.redact).toEqual(
      expect.objectContaining({ censor: '[REDACTED]' }),
    );
  });
});

describe('log shape contract', () => {
  it('emits required fields on a log line', () => {
    const { logger, lastLine } = createCapturingLogger('ingestion-service');

    RequestContext.run({ correlationId: 'corr-shape', startedAt: 1 }, () => {
      logger.info('telemetry accepted');
    });

    const line = lastLine();
    expect(line).toMatchObject({
      level: 'info',
      service: 'ingestion-service',
      correlationId: 'corr-shape',
      msg: 'telemetry accepted',
    });
    expect(line).toHaveProperty('time');
  });
});
