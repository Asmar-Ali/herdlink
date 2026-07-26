import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_OPTIONS } from '../auth.tokens.js';
import {
  DEFAULT_ISSUER,
  DEFAULT_SERVICE_TOKEN_TTL_SECONDS,
  DEFAULT_USER_TOKEN_TTL_SECONDS,
  type AuthModuleOptions,
} from '../auth.options.js';
import type { JwtPayload } from '../jwt-payload.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  signUser(sub: string, roles: string[] = []): Promise<string> {
    const payload: Pick<JwtPayload, 'sub' | 'type' | 'roles'> = {
      sub,
      type: 'user',
      roles,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.options.secret,
      issuer: this.options.issuer ?? DEFAULT_ISSUER,
      expiresIn: this.options.userTokenTtlSeconds ?? DEFAULT_USER_TOKEN_TTL_SECONDS,
    });
  }

  signService(serviceName: string): Promise<string> {
    const payload: Pick<JwtPayload, 'sub' | 'type'> = {
      sub: `service:${serviceName}`,
      type: 'service',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.options.secret,
      issuer: this.options.issuer ?? DEFAULT_ISSUER,
      expiresIn:
        this.options.serviceTokenTtlSeconds ?? DEFAULT_SERVICE_TOKEN_TTL_SECONDS,
    });
  }
}
