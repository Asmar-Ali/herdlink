import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  CallHandler,
  ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { Request } from 'express';
import { RequestContext } from '../context/request-context.js';
import type { Logger } from '../logging/create-logger.js';
import { TracingInterceptor } from './tracing.interceptor.js';

function createHttpContext(req: Partial<Request> = {}): ExecutionContext {
  const request = {
    method: 'GET',
    url: '/api/v1/test',
    originalUrl: '/api/v1/test',
    ...req,
  } as Request;

  return {
    getType: () => 'http',
    getClass: () => ({ name: 'TestController' }),
    getHandler: () => ({ name: 'get' }),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function createHandler(
  result: unknown,
  onHandle?: () => void,
): CallHandler {
  return {
    handle: () => {
      onHandle?.();
      return of(result);
    },
  };
}

describe('TracingInterceptor', () => {
  let logger: Logger;
  let info: jest.Mock;
  let warn: jest.Mock;
  let interceptor: NestInterceptor;

  beforeEach(() => {
    info = jest.fn();
    warn = jest.fn();
    logger = { info, warn } as unknown as Logger;
    interceptor = new TracingInterceptor(logger);
  });

  it('passes through non-http contexts unchanged', async () => {
    const ctx = { getType: () => 'rpc' } as ExecutionContext;
    const handle = jest.fn(() => of('ok'));

    const result = await lastValueFrom(
      interceptor.intercept(ctx, { handle }),
    );

    expect(result).toBe('ok');
    expect(handle).toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('sets RequestContext and logs success for HTTP requests', async () => {
    let correlationInsideHandler: string | undefined;

    const ctx = createHttpContext({ correlationId: 'corr-http' });
    const handler = createHandler({ ok: true }, () => {
      correlationInsideHandler = RequestContext.correlationId();
    });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(correlationInsideHandler).toBe('corr-http');
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        handler: 'TestController.get',
        route: 'GET /api/v1/test',
        outcome: 'ok',
        durationMs: expect.any(Number),
      }),
      'request completed',
    );
  });

  it('generates a correlation id when the request has none', async () => {
    let correlationInsideHandler: string | undefined;
    const ctx = createHttpContext();
    const handler = createHandler(null, () => {
      correlationInsideHandler = RequestContext.correlationId();
    });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(correlationInsideHandler).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('rethrows errors and logs failure', async () => {
    const ctx = createHttpContext({ correlationId: 'corr-fail' });
    const error = new Error('boom');
    const handler: CallHandler = {
      handle: () => throwError(() => error),
    };

    await expect(
      lastValueFrom(interceptor.intercept(ctx, handler)),
    ).rejects.toThrow('boom');

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        handler: 'TestController.get',
        outcome: 'error',
        durationMs: expect.any(Number),
      }),
      'request failed',
    );
  });
});
