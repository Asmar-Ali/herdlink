import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUTH_OPTIONS } from '../auth.tokens.js';
import type {
  AuthModuleAsyncOptions,
  AuthModuleOptions,
} from '../auth.options.js';
import { TokenService } from '../token/token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

/**
 * Registers the guard as APP_GUARD so every route in the importing service
 * is protected by default — routes opt out with @Public(), rather than
 * services having to remember to opt in.
 */
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      providers: [
        { provide: AUTH_OPTIONS, useValue: options },
        JwtStrategy,
        TokenService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
      exports: [JwtModule, TokenService],
    };
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [
        ...(options.imports ?? []),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      providers: [
        {
          provide: AUTH_OPTIONS,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        JwtStrategy,
        TokenService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
      exports: [JwtModule, TokenService],
    };
  }
}
