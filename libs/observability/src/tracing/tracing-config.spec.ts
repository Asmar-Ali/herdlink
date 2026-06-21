import { afterEach, describe, expect, it } from '@jest/globals';
import {
  buildOtlpTraceUrl,
  isTracingEnabled,
  resolveOtlpEndpoint,
} from './tracing-config.js';

describe('tracing-config', () => {
  const originalDisabled = process.env.OTEL_SDK_DISABLED;
  const originalEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  afterEach(() => {
    if (originalDisabled === undefined) {
      delete process.env.OTEL_SDK_DISABLED;
    } else {
      process.env.OTEL_SDK_DISABLED = originalDisabled;
    }

    if (originalEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEndpoint;
    }
  });

  describe('isTracingEnabled', () => {
    it('returns false when enabled option is false', () => {
      expect(isTracingEnabled({ serviceName: 'x', enabled: false })).toBe(
        false,
      );
    });

    it('returns false when OTEL_SDK_DISABLED=true', () => {
      process.env.OTEL_SDK_DISABLED = 'true';
      expect(isTracingEnabled({ serviceName: 'x' })).toBe(false);
    });

    it('returns true by default', () => {
      delete process.env.OTEL_SDK_DISABLED;
      expect(isTracingEnabled({ serviceName: 'x' })).toBe(true);
    });
  });

  describe('resolveOtlpEndpoint', () => {
    it('prefers the option over env and default', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://env:4318';
      expect(
        resolveOtlpEndpoint({
          serviceName: 'x',
          otlpEndpoint: 'http://option:4318',
        }),
      ).toBe('http://option:4318');
    });

    it('falls back to env then default', () => {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      expect(resolveOtlpEndpoint({ serviceName: 'x' })).toBe(
        'http://localhost:4318',
      );

      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://jaeger:4318';
      expect(resolveOtlpEndpoint({ serviceName: 'x' })).toBe(
        'http://jaeger:4318',
      );
    });
  });

  describe('buildOtlpTraceUrl', () => {
    it('appends /v1/traces and strips trailing slash', () => {
      expect(buildOtlpTraceUrl('http://localhost:4318/')).toBe(
        'http://localhost:4318/v1/traces',
      );
      expect(buildOtlpTraceUrl('http://localhost:4318')).toBe(
        'http://localhost:4318/v1/traces',
      );
    });
  });
});
