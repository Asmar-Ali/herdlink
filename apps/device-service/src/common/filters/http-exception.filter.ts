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
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

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
