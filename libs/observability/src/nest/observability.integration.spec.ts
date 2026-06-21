import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
  Req,
} from '@nestjs/common';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { Request } from 'express';
import request from 'supertest';
import { CORRELATION_ID_HEADER } from '../constants.js';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';
import { ObservabilityModule } from './observability.module.js';
import { TracingInterceptor } from './tracing.interceptor.js';

@Controller()
class ProbeController {
  @Get('probe')
  probe(@Req() req: Request) {
    return { correlationId: req.correlationId };
  }
}

@Module({
  imports: [ObservabilityModule.forRoot({ serviceName: 'integration-test' })],
  controllers: [ProbeController],
})
class IntegrationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

describe('observability HTTP integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.OTEL_SDK_DISABLED = 'true';

    const moduleRef = await NestFactory.create(IntegrationModule, {
      logger: false,
    });
    app = moduleRef;
    app.useGlobalInterceptors(app.get(TracingInterceptor));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('forwards x-correlation-id on the response', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe')
      .set(CORRELATION_ID_HEADER, 'client-corr-id')
      .expect(200);

    expect(response.body.correlationId).toBe('client-corr-id');
    expect(response.headers[CORRELATION_ID_HEADER]).toBe('client-corr-id');
  });

  it('generates a ULID when x-correlation-id is absent', async () => {
    const response = await request(app.getHttpServer()).get('/probe').expect(200);

    expect(response.body.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(response.headers[CORRELATION_ID_HEADER]).toBe(
      response.body.correlationId,
    );
  });
});
