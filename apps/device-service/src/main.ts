import 'reflect-metadata';
import './instrument.js';
import { createNestLogger } from '@herdlink/observability';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';

const SERVICE_NAME = 'device-service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: createNestLogger({ serviceName: SERVICE_NAME }),
  });
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
