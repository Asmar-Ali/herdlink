import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('POSTGRES_HOST'),
    port: parseInt(config.get<string>('POSTGRES_PORT', '5432'), 10),
    username: config.getOrThrow<string>('POSTGRES_USER'),
    password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
    database: config.getOrThrow<string>('POSTGRES_DB'),
    autoLoadEntities: true,
    synchronize: config.get<string>('NODE_ENV') !== 'production',
    logging: config.get<string>('NODE_ENV') === 'development',
  };
}
