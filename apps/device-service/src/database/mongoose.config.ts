import type { ConfigService } from '@nestjs/config';
import type { MongooseModuleFactoryOptions } from '@nestjs/mongoose';

export function createMongooseOptions(
  config: ConfigService,
): MongooseModuleFactoryOptions {
  return {
    uri: config.getOrThrow<string>('MONGODB_URI'),
    serverSelectionTimeoutMS: 5_000,
  };
}
