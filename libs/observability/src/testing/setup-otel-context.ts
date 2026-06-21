import { context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';

/**
 * Mirrors what NodeSDK registers in production so span context is visible to
 * `trace.getSpan(context.active())` in unit tests.
 */
export function setupOtelContextForTests(): {
  provider: BasicTracerProvider;
  contextManager: AsyncLocalStorageContextManager;
} {
  const contextManager = new AsyncLocalStorageContextManager();
  contextManager.enable();
  context.setGlobalContextManager(contextManager);

  const provider = new BasicTracerProvider();
  trace.setGlobalTracerProvider(provider);

  return { provider, contextManager };
}

export async function teardownOtelContextForTests(
  provider: BasicTracerProvider,
): Promise<void> {
  await provider.shutdown();
}
