import { AuthModule } from '@herdlink/auth';
import {
  CorrelationIdMiddleware,
  ObservabilityModule,
} from '@herdlink/observability';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/validate-env.js';
import { createMongooseOptions } from './database/mongoose.config.js';
import { createTypeOrmOptions } from './database/typeorm.config.js';
import { DeviceModule } from './device/device.module.js';
import { FenceModule } from './fence/fence.module.js';

@Module({
  imports: [
    ObservabilityModule.forRoot({ serviceName: 'device-service' }),
    // Must precede AuthModule: ConfigModule.forRoot loads .env into
    // process.env synchronously, and validateEnv guarantees JWT_SECRET
    // is present before AuthModule resolves it below.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createTypeOrmOptions(config),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createMongooseOptions(config),
    }),
    DeviceModule,
    FenceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
