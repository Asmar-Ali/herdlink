import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginRequest } from './auth.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('loginRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts credentials to the login endpoint and unwraps the envelope', async () => {
    const session = {
      token: 'signed.jwt.token',
      user: {
        id: 'user-rancher',
        email: 'rancher@herdlink.io',
        name: 'Rancher',
        role: 'Ranch operator',
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: session, meta: {} }));

    const result = await loginRequest('rancher@herdlink.io', 'herdlink-demo');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'rancher@herdlink.io',
          password: 'herdlink-demo',
        }),
      }),
    );
    expect(result).toEqual(session);
  });

  it('throws a credentials error on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Invalid email or password' }, 401),
    );

    await expect(
      loginRequest('rancher@herdlink.io', 'wrong-password'),
    ).rejects.toThrow(/invalid email or password/i);
  });

  it('throws a reachability error when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));

    await expect(
      loginRequest('rancher@herdlink.io', 'herdlink-demo'),
    ).rejects.toThrow(/unable to reach the server/i);
  });
});
