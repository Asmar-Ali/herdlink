import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_OPTIONS } from '../auth.tokens.js';
import { DEFAULT_ISSUER, type AuthModuleOptions } from '../auth.options.js';
import type { AuthenticatedUser, JwtPayload } from '../jwt-payload.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AUTH_OPTIONS) options: AuthModuleOptions) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: options.secret,
      algorithms: ['HS256'],
      issuer: options.issuer ?? DEFAULT_ISSUER,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      type: payload.type,
      roles: payload.roles ?? [],
    };
  }
}
