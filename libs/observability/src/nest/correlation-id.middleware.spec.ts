import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../constants.js';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  function createMocks(inboundHeader?: string) {
    const req = {
      header: jest.fn((name: string) =>
        name === CORRELATION_ID_HEADER ? inboundHeader : undefined,
      ),
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    return { req, res, next };
  }

  it('forwards an inbound correlation id', () => {
    const { req, res, next } = createMocks('abc-123');

    middleware.use(req, res, next);

    expect(req.correlationId).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      'abc-123',
    );
    expect(next).toHaveBeenCalled();
  });

  it('generates a ULID when the header is missing', () => {
    const { req, res, next } = createMocks();

    middleware.use(req, res, next);

    expect(req.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      req.correlationId,
    );
  });

  it('generates a ULID when the header is empty or whitespace', () => {
    for (const inbound of ['', '   ']) {
      const { req, res, next } = createMocks(inbound);

      middleware.use(req, res, next);

      expect(req.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(res.setHeader).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        req.correlationId,
      );
      expect(next).toHaveBeenCalled();
    }
  });
});
