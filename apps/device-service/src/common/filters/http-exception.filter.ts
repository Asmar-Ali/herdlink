import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from '@herdlink/observability';

type RequestWithCorrelationId = Request & { correlationId?: string };

/**
 * True for HttpException instances — including ones thrown from a *different*
 * copy of `@nestjs/common`. `@herdlink/auth` carries its own nested
 * node_modules, so the `UnauthorizedException` Passport throws is a different
 * class identity than this service's `HttpException` and fails a plain
 * `instanceof`, which previously masked genuine 401/403s as 500s. Duck-typing
 * on `getStatus`/`getResponse` recovers the real status. (Same root cause the
 * JwtAuthGuard works around for the Reflector; the durable fix is to hoist
 * `@nestjs/*` to a single copy via peerDependencies in `@herdlink/auth`.)
 */
function isHttpExceptionLike(err: unknown): err is HttpException {
  return (
    err instanceof HttpException ||
    (typeof err === 'object' &&
      err !== null &&
      typeof (err as HttpException).getStatus === 'function' &&
      typeof (err as HttpException).getResponse === 'function')
  );
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  correlationId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelationId>();

    const isHttpException = isHttpExceptionLike(exception);

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse = isHttpException ? exception.getResponse() : null;

    const message: string | string[] =
      rawResponse !== null
        ? typeof rawResponse === 'object' && 'message' in rawResponse
          ? (rawResponse as { message: string | string[] }).message
          : (rawResponse as string)
        : 'Internal server error';

    const errorLabel =
      rawResponse !== null &&
      typeof rawResponse === 'object' &&
      'error' in rawResponse
        ? (rawResponse as { error: string }).error
        : (HttpStatus[statusCode] ?? 'Error');

    const correlationId =
      request.correlationId ?? RequestContext.correlationId();

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode} [${correlationId ?? 'no-cid'}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode,
      error: errorLabel,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(correlationId ? { correlationId } : {}),
    };

    response.status(statusCode).json(body);
  }
}
