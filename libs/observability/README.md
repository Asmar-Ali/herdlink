# @herdlink/observability

Shared **Pino** logging and **OpenTelemetry** tracing for HerdLink NestJS services.

## What you get

- Structured JSON logs with `service`, `correlationId`, `traceId`, `spanId`, `level`, `timestamp`, `msg`
- Pino redaction for secrets (`authorization`, `password`, `token`, …)
- OpenTelemetry Node SDK → OTLP HTTP → Jaeger (`OTEL_EXPORTER_OTLP_ENDPOINT`, default `http://localhost:4318`)
- NestJS `ObservabilityModule` with correlation-id middleware, tracing interceptor, injectable `LOGGER`
- AsyncLocalStorage request context so logs pick up correlation IDs without plumbing

## Usage in a service

### 1. Install

```json
{
  "dependencies": {
    "@herdlink/observability": "file:../../libs/observability"
  }
}
```

Run `npm install` in the service directory (the lib builds via `prepare`).

### 2. Bootstrap tracing first

Create `src/instrument.ts` and import it as the **first line** of `main.ts` so the SDK loads before NestJS:

```typescript
// src/instrument.ts
import { initTracing } from '@herdlink/observability/instrumentation';

initTracing({ serviceName: 'mqtt-bridge' });
```

```typescript
// main.ts
import './instrument.js';

import { NestFactory } from '@nestjs/core';
import { createNestLogger } from '@herdlink/observability';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: createNestLogger({ serviceName: 'mqtt-bridge' }),
  });
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

### 3. Register the module

```typescript
import { CorrelationIdMiddleware, ObservabilityModule } from '@herdlink/observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({ serviceName: 'mqtt-bridge' }),
    // ...
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

### 4. Wire global interceptors

```typescript
import { TracingInterceptor } from '@herdlink/observability';

export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalInterceptors(
    app.get(TracingInterceptor),
    // other interceptors…
  );
  return app;
}
```

### 5. Inject the logger in services

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, type Logger } from '@herdlink/observability';

@Injectable()
export class IngestionService {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  process() {
    this.logger.info({ deviceId: '…' }, 'telemetry accepted');
  }
}
```

## Environment

| Variable | Purpose |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Jaeger OTLP HTTP base URL (default `http://localhost:4318`) |
| `OTEL_SDK_DISABLED=true` | Disable tracing (tests, local without Jaeger) |
| `LOG_LEVEL` | Pino level (`info` default) |

## Correlation IDs

Inbound `x-correlation-id` is forwarded; otherwise a **ULID** is generated at the edge and echoed on the response. Every log line and span carries `correlationId`.

## Standards

Authoritative requirements: [`.cursor/rules/reliability-scalability.mdc`](../../.cursor/rules/reliability-scalability.mdc), [`.cursor/rules/nodejs.mdc`](../../.cursor/rules/nodejs.mdc).
