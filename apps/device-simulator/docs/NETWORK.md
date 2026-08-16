# device-simulator — Network & I/O Contract

> Every byte in and out of this service. This is what you read before wiring it to anything else.
> Standards: [mqtt.mdc](../../../.cursor/rules/mqtt.mdc), [nodejs.mdc](../../../.cursor/rules/nodejs.mdc).

## Listening ports

| Port | Protocol | Purpose |
|---|---|---|
| `3010` (`HEALTH_PORT`) | HTTP | `/health` liveness probe only — no other routes |

## Kafka

Not applicable — this service speaks MQTT only. `mqtt-bridge` (not yet built) is the service that bridges MQTT to Kafka's `telemetry.raw` topic.

## Datastores

None. The service is stateless in-process (position/battery/sequence live only in memory for the process lifetime).

## Synchronous calls (outbound)

None.

## MQTT

- **Broker:** Mosquitto (`MQTT_BROKER_URL`, default `mqtt://localhost:1883`; `mqtt://mosquitto:1883` inside Docker Compose)
- **Topic:** `herdlink/telemetry/<deviceId>` — per-device topic (default device: `SIM-000001`), lets future consumers wildcard-subscribe `herdlink/telemetry/#`
- **Client ID:** `device-simulator-<serialNumber>`
- **QoS:** 1 (at-least-once — matches the platform's idempotent-consumer philosophy; downstream consumers are expected to dedupe)
- **Retained:** false — telemetry is a stream, not last-known-state
- **Last-will:** documented but not wired. Offline/reconnect simulation is deferred (no M1 deliverable needs it, no downstream reconciliation consumer exists yet) — **known gap for M2**, see [TODO.md](./TODO.md)
- **Reconnect:** relies on `mqtt.js`'s default auto-reconnect behaviour — no custom retry/backoff logic

## Observability emitted

- **Logs:** Pino JSON via `@herdlink/observability`'s `createLogger`, with `correlationId` embedded per-message (MQTT has no first-class headers, so it travels inside the `TelemetryMessage` payload instead of a log/trace context field).
- **Metrics:** none yet (M4).
- **Traces:** OpenTelemetry Node SDK bootstrapped via `initTracing` in `instrument.ts`; no custom spans yet beyond auto-instrumentation.
