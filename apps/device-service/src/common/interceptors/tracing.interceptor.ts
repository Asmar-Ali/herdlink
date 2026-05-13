import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RequestContext } from '../context/request-context.js';

/**
 * Opens a "span" around every handler:
 *   - pushes correlationId into AsyncLocalStorage so downstream code/logs
 *     pick it up without parameter drilling,
 *   - logs handler entry/exit with duration and outcome.
 *
 * When OTel is wired in, swap the manual start/end + log lines for
 * `tracer.startActiveSpan(...)`. The AsyncLocalStorage boundary stays.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Tracing');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') {
      return next.handle();
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    const correlationId = req.correlationId ?? randomUUID();
    const startedAt = Date.now();
    const handler = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    const route = `${req.method} ${req.originalUrl ?? req.url}`;

    return RequestContext.run({ correlationId, startedAt }, () =>
      next.handle().pipe(
        tap(() => {
          this.logger.log(
            `${route} → ${handler} ok in ${Date.now() - startedAt}ms [${correlationId}]`,
          );
        }),
        catchError((err: unknown) => {
          this.logger.warn(
            `${route} → ${handler} fail in ${Date.now() - startedAt}ms [${correlationId}]`,
          );
          throw err;
        }),
      ),
    );
  }
}
