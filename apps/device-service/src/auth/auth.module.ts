import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/**
 * The login feature. `TokenService` is provided globally by the platform
 * `@herdlink/auth` AuthModule (wired in app.module.ts), so it is injectable
 * here without re-importing anything.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
