import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, jest } from '@jest/globals';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

function createContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('bypasses passport verification for @Public() routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate: unknown } as {
        canActivate: (...args: unknown[]) => unknown;
      },
      'canActivate',
    );

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );

    superCanActivate.mockRestore();
  });

  it('delegates to passport verification for protected routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest
      .spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate: unknown } as {
          canActivate: (...args: unknown[]) => unknown;
        },
        'canActivate',
      )
      .mockReturnValue(true);

    const result = guard.canActivate(createContext());

    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(true);

    superCanActivate.mockRestore();
  });
});
