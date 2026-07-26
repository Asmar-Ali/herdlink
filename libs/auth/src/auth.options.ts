import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';

export interface AuthModuleOptions {
  secret: string;
  issuer?: string;
  /** Seconds until a user token expires. */
  userTokenTtlSeconds?: number;
  /** Seconds until a service (machine-to-machine) token expires. */
  serviceTokenTtlSeconds?: number;
}

export interface AuthModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: FactoryProvider<AuthModuleOptions>['inject'];
  useFactory: FactoryProvider<AuthModuleOptions>['useFactory'];
}

export const DEFAULT_ISSUER = 'herdlink';
export const DEFAULT_USER_TOKEN_TTL_SECONDS = 60 * 60; // 1h
export const DEFAULT_SERVICE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 365d
