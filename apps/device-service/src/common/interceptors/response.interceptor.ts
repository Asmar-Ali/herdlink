import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  data: T;
  meta: {
    timestamp: string;
    correlationId?: string;
  };
}

/**
 * Wraps every successful HTTP response in a `{ data, meta }` envelope.
 * Streams and already-shaped envelopes pass through untouched. Errors are
 * shaped by HttpExceptionFilter, not here.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T> | T
> {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T> | T> {
    if (ctx.getType() !== 'http') {
      return next.handle();
    }

    const req = ctx.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return data;
        }
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
          },
        };
      }),
    );
  }
}
