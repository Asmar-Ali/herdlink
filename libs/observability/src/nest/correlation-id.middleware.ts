import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ulid } from 'ulid';
import { CORRELATION_ID_HEADER } from '../constants.js';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Forwards an inbound `x-correlation-id` header or generates a ULID, then
 * exposes it on `req.correlationId` and echoes it back on the response.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      inbound && inbound.trim().length > 0 ? inbound.trim() : ulid();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}

export { CORRELATION_ID_HEADER };
