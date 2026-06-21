import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ulid } from 'ulid';
import { RequestContext } from '../context/request-context.js';
import type { Logger } from '../logging/create-logger.js';
import { LOGGER } from './observability.tokens.js';

/**
 * Opens an OpenTelemetry span around every HTTP handler and runs the handler
 * inside AsyncLocalStorage so logs pick up correlationId/traceId/spanId.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') {
      return next.handle();
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    const correlationId = req.correlationId ?? ulid();
    const startedAt = Date.now();
    const handler = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    const route = `${req.method} ${req.originalUrl ?? req.url}`;
    const tracer = trace.getTracer('nestjs');

    return tracer.startActiveSpan(route, (span) => {
      span.setAttribute('correlationId', correlationId);
      span.setAttribute('http.method', req.method);
      span.setAttribute('http.route', req.originalUrl ?? req.url);
      span.setAttribute('nestjs.handler', handler);

      return RequestContext.run({ correlationId, startedAt }, () =>
        next.handle().pipe(
          tap(() => {
            span.setStatus({ code: SpanStatusCode.OK });
            this.logger.info(
              {
                handler,
                route,
                durationMs: Date.now() - startedAt,
                outcome: 'ok',
              },
              'request completed',
            );
          }),
          catchError((err: unknown) => {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            this.logger.warn(
              {
                handler,
                route,
                durationMs: Date.now() - startedAt,
                outcome: 'error',
              },
              'request failed',
            );
            throw err;
          }),
          finalize(() => {
            if (span.isRecording()) {
              span.end();
            }
          }),
        ),
      );
    });
  }
}
