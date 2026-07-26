import { AUTH_TOKEN_KEY } from '../auth/auth-context.ts';

/*
 * Thin fetch wrapper for device-service's REST API.
 *
 * All requests go same-origin under `/api/v1/...`; the Vite dev server proxies
 * that prefix to device-service (see vite.config.ts), so there's no CORS to
 * configure and the SPA never needs to know the backend host. Every successful
 * response is wrapped in device-service's `{ data, meta }` envelope — this
 * helper unwraps `.data`. Mutations require auth, so we attach the JWT that
 * AuthProvider persisted at login. Errors are shaped by the backend's
 * HttpExceptionFilter as `{ statusCode, error, message }`; we surface `message`
 * so React Query's onError toasts read well.
 */

const API_PREFIX = '/api/v1';

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

/** A non-2xx response (status 0 = the request never reached the server). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = res.statusText || 'Request failed';
  try {
    const body = (await res.json()) as ErrorEnvelope;
    if (body?.message) {
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
  } catch {
    // Non-JSON error body (e.g. a proxy 502) — keep the status text.
  }
  return new ApiError(message, res.status);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const hasBody = body !== undefined;

  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      method,
      headers: {
        ...authHeaders(),
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0);
  }

  if (!res.ok) throw await toApiError(res);

  // 204 No Content (or an empty body) — nothing to unwrap.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const envelope = (await res.json()) as Envelope<T>;
  return envelope.data;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

/** Builds a `?a=1&b=2` string, skipping undefined values. Empty → ''. */
export function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
