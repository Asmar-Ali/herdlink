import { DEFAULT_OTLP_ENDPOINT } from '../constants.js';
import type { TracingOptions } from './tracing.options.js';

export function isTracingEnabled(options: TracingOptions): boolean {
  if (options.enabled === false) {
    return false;
  }
  if (process.env.OTEL_SDK_DISABLED === 'true') {
    return false;
  }
  return true;
}

export function resolveOtlpEndpoint(options: TracingOptions): string {
  return (
    options.otlpEndpoint ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    DEFAULT_OTLP_ENDPOINT
  );
}

export function buildOtlpTraceUrl(endpoint: string): string {
  return `${endpoint.replace(/\/$/, '')}/v1/traces`;
}
