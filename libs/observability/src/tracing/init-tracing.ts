import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import type { TracingOptions } from './tracing.options.js';
import {
  buildOtlpTraceUrl,
  isTracingEnabled,
  resolveOtlpEndpoint,
} from './tracing-config.js';

let sdk: NodeSDK | undefined;
let shutdownRegistered = false;

/**
 * Bootstraps the OpenTelemetry Node SDK. Call this as the first import in
 * `main.ts`, before NestFactory or any instrumented client is loaded.
 */
export function initTracing(options: TracingOptions): void {
  if (sdk || !isTracingEnabled(options)) {
    return;
  }

  const endpoint = resolveOtlpEndpoint(options);
  const resourceAttributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: options.serviceName,
  };

  if (options.serviceVersion) {
    resourceAttributes[ATTR_SERVICE_VERSION] = options.serviceVersion;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes(resourceAttributes),
    traceExporter: new OTLPTraceExporter({
      url: buildOtlpTraceUrl(endpoint),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  registerShutdownHooks();
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) {
    return;
  }

  const activeSdk = sdk;
  sdk = undefined;
  await activeSdk.shutdown();
}

function registerShutdownHooks(): void {
  if (shutdownRegistered) {
    return;
  }

  shutdownRegistered = true;

  const shutdown = () => {
    void shutdownTracing();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
}
