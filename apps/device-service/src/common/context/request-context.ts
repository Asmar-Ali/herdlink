import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  correlationId: string;
  startedAt: number;
}

/**
 * Per-request store. The CorrelationIdMiddleware stamps the id, the
 * TracingInterceptor runs everything below the handler inside `.run(...)`,
 * so any service / repository / logger picked up via `RequestContext.get()`
 * sees the same correlation id without explicit plumbing.
 */
export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return requestContextStorage.run(store, fn);
  },
  get(): RequestContextStore | undefined {
    return requestContextStorage.getStore();
  },
  correlationId(): string | undefined {
    return requestContextStorage.getStore()?.correlationId;
  },
};
