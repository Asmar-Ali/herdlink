import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

// Pull payload out of the global envelope.
const payload = <T>(body: { data: T }): T => body.data;

const LOGIN = '/api/v1/auth/login';
const VALID = { email: 'rancher@herdlink.io', password: 'herdlink-demo' };

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues a JWT and the operator for valid credentials (200, public route)', async () => {
    const res = await request(app.getHttpServer())
      .post(LOGIN)
      .send(VALID)
      .expect(200);

    const data = payload<{ token: string; user: Record<string, unknown> }>(
      res.body,
    );
    expect(typeof data.token).toBe('string');
    // JWTs are three dot-separated base64url segments.
    expect(data.token.split('.')).toHaveLength(3);
    expect(data.user).toEqual({
      id: 'user-rancher',
      email: 'rancher@herdlink.io',
      name: 'Rancher',
      role: 'Ranch operator',
    });
    // Response is wrapped in the standard envelope.
    expect(res.body.meta).toHaveProperty('timestamp');
  });

  it('accepts the demo email case-insensitively', async () => {
    await request(app.getHttpServer())
      .post(LOGIN)
      .send({ email: 'RANCHER@HERDLINK.IO', password: VALID.password })
      .expect(200);
  });

  it('rejects a wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post(LOGIN)
      .send({ email: VALID.email, password: 'not-the-password' })
      .expect(401);
  });

  it('rejects an unknown email with 401', async () => {
    await request(app.getHttpServer())
      .post(LOGIN)
      .send({ email: 'intruder@herdlink.io', password: VALID.password })
      .expect(401);
  });

  it('rejects a malformed payload with 400 (validation)', async () => {
    await request(app.getHttpServer())
      .post(LOGIN)
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('rejects unknown fields with 400 (whitelist)', async () => {
    await request(app.getHttpServer())
      .post(LOGIN)
      .send({ ...VALID, role: 'admin' })
      .expect(400);
  });
});
