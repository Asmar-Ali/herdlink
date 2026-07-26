import type { AuthUser } from '../auth/auth-context.ts';

/*
 * Real login call against device-service's `POST /api/v1/auth/login`.
 *
 * Requests go to the same origin under `/api` — the Vite dev server proxies
 * that prefix to device-service (see vite.config.ts), so there's no CORS to
 * configure and the SPA doesn't need to know the backend's host. device-service
 * wraps every response in the `{ data, meta }` envelope, so we unwrap `.data`.
 */

export interface LoginSession {
  token: string;
  user: AuthUser;
}

interface Envelope<T> {
  data: T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginSession> {
  let res: Response;
  try {
    res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Unable to reach the server. Please try again.');
  }

  if (res.status === 401) {
    throw new Error('Invalid email or password.');
  }
  if (!res.ok) {
    throw new Error('Unable to sign in. Please try again.');
  }

  const body = (await res.json()) as Envelope<LoginSession>;
  return body.data;
}
