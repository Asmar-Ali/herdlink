import { afterEach, describe, expect, it } from '@jest/globals';
import { initTracing, shutdownTracing } from './init-tracing.js';

describe('initTracing', () => {
  const originalDisabled = process.env.OTEL_SDK_DISABLED;

  afterEach(async () => {
    await shutdownTracing();
    if (originalDisabled === undefined) {
      delete process.env.OTEL_SDK_DISABLED;
    } else {
      process.env.OTEL_SDK_DISABLED = originalDisabled;
    }
  });

  it('does not start when OTEL_SDK_DISABLED=true', () => {
    process.env.OTEL_SDK_DISABLED = 'true';

    expect(() =>
      initTracing({ serviceName: 'test-service' }),
    ).not.toThrow();
  });

  it('does not start when enabled option is false', () => {
    delete process.env.OTEL_SDK_DISABLED;

    expect(() =>
      initTracing({ serviceName: 'test-service', enabled: false }),
    ).not.toThrow();
  });

  it('is idempotent when tracing is disabled', () => {
    process.env.OTEL_SDK_DISABLED = 'true';

    initTracing({ serviceName: 'test-service' });
    expect(() =>
      initTracing({ serviceName: 'test-service' }),
    ).not.toThrow();
  });

  it('shutdownTracing is safe when tracing never started', async () => {
    process.env.OTEL_SDK_DISABLED = 'true';

    await expect(shutdownTracing()).resolves.toBeUndefined();
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });
});
