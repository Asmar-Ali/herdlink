import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Forwards an inbound `x-correlation-id` header or generates one, then
 * exposes it on `req.correlationId` and echoes it back on the response so
 * clients can correlate logs with what they sent.
 *
 * Lives in middleware (not an interceptor) because:
 *   1. it must run before guards / pipes / interceptors that may want to log,
 *   2. response headers are cleaner to set here than in a Rx pipe.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      inbound && inbound.trim().length > 0 ? inbound.trim() : randomUUID();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
