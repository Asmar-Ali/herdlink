import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  correlationId: string;
  startedAt: number;
}

/**
 * Per-request store. CorrelationIdMiddleware stamps the id; TracingInterceptor
 * runs handler code inside `.run(...)` so logs and spans share the same context
 * without parameter drilling.
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
