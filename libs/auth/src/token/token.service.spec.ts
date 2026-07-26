import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from '@jest/globals';
import { AUTH_OPTIONS } from '../auth.tokens.js';
import { TokenService } from './token.service.js';

const SECRET = 'unit-test-secret';
const ISSUER = 'herdlink';

async function createService(): Promise<TokenService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      TokenService,
      { provide: AUTH_OPTIONS, useValue: { secret: SECRET, issuer: ISSUER } },
      {
        provide: JwtService,
        useValue: new JwtService({ secret: SECRET }),
      },
    ],
  }).compile();

  return moduleRef.get(TokenService);
}

describe('TokenService', () => {
  it('signs a user token carrying sub, type, and roles', async () => {
    const service = await createService();
    const token = await service.signUser('user:admin', ['operator']);

    const payload = new JwtService({ secret: SECRET }).verify(token, {
      issuer: ISSUER,
    });

    expect(payload.sub).toBe('user:admin');
    expect(payload.type).toBe('user');
    expect(payload.roles).toEqual(['operator']);
    expect(payload.exp).toBeDefined();
  });

  it('signs a service token with a service: prefixed subject and no roles', async () => {
    const service = await createService();
    const token = await service.signService('device-simulator');

    const payload = new JwtService({ secret: SECRET }).verify(token, {
      issuer: ISSUER,
    });

    expect(payload.sub).toBe('service:device-simulator');
    expect(payload.type).toBe('service');
    expect(payload.roles).toBeUndefined();
  });

  it('produces tokens that fail verification against a different secret', async () => {
    const service = await createService();
    const token = await service.signUser('user:admin');

    expect(() =>
      new JwtService({ secret: 'wrong-secret' }).verify(token),
    ).toThrow();
  });
});
