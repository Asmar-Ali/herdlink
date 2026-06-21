import { DynamicModule, Module } from '@nestjs/common';
import { createLogger } from '../logging/create-logger.js';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';
import type { ObservabilityOptions } from './observability.options.js';
import { LOGGER, OBSERVABILITY_OPTIONS } from './observability.tokens.js';
import { TracingInterceptor } from './tracing.interceptor.js';

@Module({})
export class ObservabilityModule {
  static forRoot(options: ObservabilityOptions): DynamicModule {
    return {
      module: ObservabilityModule,
      global: true,
      providers: [
        {
          provide: OBSERVABILITY_OPTIONS,
          useValue: options,
        },
        {
          provide: LOGGER,
          useFactory: (opts: ObservabilityOptions) =>
            createLogger({
              serviceName: opts.serviceName,
              level: opts.logLevel,
            }),
          inject: [OBSERVABILITY_OPTIONS],
        },
        CorrelationIdMiddleware,
        TracingInterceptor,
      ],
      exports: [LOGGER, CorrelationIdMiddleware, TracingInterceptor],
    };
  }
}
