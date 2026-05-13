import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { TracingInterceptor } from './common/interceptors/tracing.interceptor.js';

/**
 * Single source of truth for global app wiring so main.ts and the e2e
 * harness can't drift apart.
 *
 * Middleware (CorrelationIdMiddleware) is wired in AppModule itself — it
 * binds to the underlying Express router, so just creating the Nest app is
 * enough to activate it. Everything else is per-app instance state and
 * must be applied here.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Order matters: tracing opens the span / AsyncLocalStorage context,
  // response wraps the payload, filter shapes any error before either runs.
  app.useGlobalInterceptors(
    new TracingInterceptor(),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  return app;
}
