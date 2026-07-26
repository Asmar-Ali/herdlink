import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../jwt-payload.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
