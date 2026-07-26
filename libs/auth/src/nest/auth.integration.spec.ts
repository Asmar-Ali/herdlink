import { Controller, Get, type INestApplication, Module, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import type { AuthenticatedUser } from '../jwt-payload.js';
import { TokenService } from '../token/token.service.js';
import { AuthModule } from './auth.module.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';

const SECRET = 'integration-test-secret';
const ISSUER = 'herdlink';

@Controller()
class TestController {
  @Public()
  @Get('public')
  publicRoute() {
    return { ok: true };
  }

  @Post('protected')
  protectedRoute(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}

@Module({
  imports: [AuthModule.forRoot({ secret: SECRET, issuer: ISSUER })],
  controllers: [TestController],
})
class TestAppModule {}

describe('Auth (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows @Public() routes without a token', async () => {
    const res = await request(app.getHttpServer()).get('/public').expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects protected routes with no Authorization header', async () => {
    await request(app.getHttpServer()).post('/protected').expect(401);
  });

  it('rejects protected routes signed with the wrong secret', async () => {
    const badToken = await new JwtService({ secret: 'wrong-secret' }).signAsync(
      { sub: 'user:admin', type: 'user' },
      { issuer: ISSUER },
    );

    await request(app.getHttpServer())
      .post('/protected')
      .set('Authorization', `Bearer ${badToken}`)
      .expect(401);
  });

  it('allows protected routes with a valid bearer token and exposes the user', async () => {
    const token = await new JwtService({ secret: SECRET }).signAsync(
      { sub: 'user:admin', type: 'user', roles: ['operator'] },
      { issuer: ISSUER },
    );

    const res = await request(app.getHttpServer())
      .post('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body.user).toEqual({
      id: 'user:admin',
      type: 'user',
      roles: ['operator'],
    });
  });

  it('supports dependency-injected async options', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({
          useFactory: () => ({ secret: SECRET, issuer: ISSUER }),
        }),
      ],
    }).compile();

    const token = await moduleRef.get(TokenService).signUser('user:async');
    expect(new JwtService({ secret: SECRET }).verify(token).sub).toBe(
      'user:async',
    );

    await moduleRef.close();
  });
});
