import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly reflector: Reflector;

  /**
   * Reflector is stateless (thin Reflect.getMetadata wrapper). We accept an
   * optional inject for tests, but fall back to `new Reflector()` because
   * Nest DI can leave it undefined when `@herdlink/auth` resolves a different
   * `@nestjs/core` copy than the host app (file: link + nested node_modules).
   */
  constructor(reflector?: Reflector) {
    super();
    this.reflector = reflector ?? new Reflector();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
