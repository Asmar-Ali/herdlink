import { Inject, Injectable } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { Logger } from '../logging/create-logger.js';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';
import { ObservabilityModule } from './observability.module.js';
import { LOGGER, OBSERVABILITY_OPTIONS } from './observability.tokens.js';
import { TracingInterceptor } from './tracing.interceptor.js';

@Injectable()
class LoggerConsumer {
  constructor(@Inject(LOGGER) readonly logger: Logger) {}
}

describe('ObservabilityModule', () => {
  it('registers LOGGER, middleware, and interceptor', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ serviceName: 'test-service' }),
      ],
    }).compile();

    const logger = moduleRef.get(LOGGER);
    const options = moduleRef.get(OBSERVABILITY_OPTIONS);
    const middleware = moduleRef.get(CorrelationIdMiddleware);
    const interceptor = moduleRef.get(TracingInterceptor);

    expect(options).toEqual({ serviceName: 'test-service' });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(middleware).toBeInstanceOf(CorrelationIdMiddleware);
    expect(interceptor).toBeInstanceOf(TracingInterceptor);
  });

  it('injects LOGGER into consumer modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ serviceName: 'test-service' }),
      ],
      providers: [LoggerConsumer],
    }).compile();

    const consumer = moduleRef.get(LoggerConsumer);
    expect(consumer.logger).toBe(moduleRef.get(LOGGER));
  });
});
