# mqtt-bridge — M1 build plan

## Context

`mqtt-bridge` is service #2 in the PRD's 9-service architecture, the **Bridge**
tier: it subscribes to `device-simulator`'s MQTT telemetry, normalises it, and
republishes onto Kafka's `telemetry.raw` topic — the sole handoff point
between the MQTT world (edge devices) and the Kafka world (everything else).
Nothing that consumes Kafka (`ingestion-service`, `geofence-engine`) can be
built or tested without it.

Two real conflicts between the standards and where the platform actually is
were surfaced and resolved with the user before this plan was written:

| Decision | Resolution |
|---|---|
| Framework shape | **Plain Node/TS script**, not NestJS — `kafka.mdc` says the Kafka client is "exposed via NestJS module," but `mqtt-bridge` has no REST/GraphQL surface, same situation as `device-simulator` (ADR-0003). This is now a second instance of that pattern; see ADR to be written. |
| Schema format | **JSON now, Avro at M2** — `kafka.mdc` says "no raw JSON on Kafka, ever," but Avro/schema-registry is an explicit **M2** PRD deliverable and both Kafka and schema-registry are still commented out in `docker-compose.yml`. Shipping Avro now means standing up schema-registry infra a milestone early. Documented as a deliberate, temporary deviation, revisited at M2. |

Two more implementation-level decisions, made without needing sign-off
(YAGNI/consistency calls, not architecture-defining):

- **`libs/kafka-client` stays unbuilt for now.** It's listed in the ROADMAP as
  "Kafka utilities + schema registry," but with only one producer
  (`mqtt-bridge`) there's nothing to share yet — extracting a shared lib for a
  single consumer is premature. Use `kafkajs` directly here; revisit when a
  second Kafka producer/consumer (`ingestion-service` or `geofence-engine`)
  exists and the duplication is real.
- **`libs/contracts` gets created now**, with just the `TelemetryMessage` /
  `Position` types moved out of `device-simulator`. This is the exact trigger
  point `device-simulator`'s own plan called out ("promoting it to
  `libs/contracts` is `mqtt-bridge`'s problem when that service needs to share
  the shape") — `mqtt-bridge` is now the second consumer of that exact shape,
  so duplicating it instead of sharing it would be the wrong call. `libs/contracts`
  was already a named, planned shared lib (PRD §4, ROADMAP), so this isn't a
  new architectural surface — just filling in something already designated.

## Key research findings

- **Correlation ID already exists in the payload.** `distributed-systems.mdc`
  says correlation IDs are "generated at the edge (mqtt-bridge for
  telemetry)" — but `device-simulator` already generates one per message
  (it's arguably the *true* edge; `device-simulator` is PRD tier "Edge",
  `mqtt-bridge` is tier "Bridge"). **Decision: `mqtt-bridge` reuses the
  `correlationId` already present in the MQTT payload rather than minting a
  new one.** This preserves end-to-end traceability from the actual device,
  not from the first internal hop. Flagging the `.mdc` wording as slightly
  imprecise now that `device-simulator` exists — worth a doc fix, out of
  scope for this change.
- **`kafka.mdc`'s producer config still applies** even without Avro:
  `acks: 'all'`, `idempotent: true`, `maxInFlightRequests: 5`, Snappy
  compression, `telemetry.raw` partition key = `deviceId`, long-lived
  singleton producer connected on startup / disconnected on shutdown.
- **No idempotency check needed on the producer side.** `distributed-systems.mdc`'s
  idempotency-key pattern (`SET … NX EX` in Redis) is a **consumer-side**
  concern — it belongs to `ingestion-service`/`geofence-engine` when they
  consume `telemetry.raw`, not to `mqtt-bridge`, which only produces.
  `mqtt-bridge`'s own resilience concern is different: MQTT QoS 1 means the
  *same* MQTT message can arrive twice, and Kafka's producer `idempotent: true`
  only dedupes producer-retry duplicates, not duplicate *inputs*. Since the
  eventual consumer will dedupe on `deviceId:timestamp` regardless (per the
  telemetry idempotency key in `distributed-systems.mdc`), a duplicate MQTT
  delivery just becomes a duplicate Kafka message that the real consumer
  correctly drops — no dedup logic needed inside `mqtt-bridge` itself.
- **Docker Compose currently has both `kafka` and `schema-registry` fully
  commented out.** Only `kafka` needs uncommenting for this change — the
  compose file's own comment explains the two-listener setup (`kafka:29092`
  for in-network services, `localhost:9092` for host tools).
- **Normalisation, concretely:** the MQTT payload is already close to the
  Kafka shape (`TelemetryMessage` from `libs/contracts`). "Normalise" here
  means: validate it parses as the expected shape (reject/DLQ malformed
  payloads rather than forwarding garbage), and that's it for M1 — no unit
  conversion or enrichment is needed since `device-simulator` already emits
  the canonical shape it defines.
- **DLQ:** `kafka.mdc` mandates a `<topic>.dlq` per topic. For M1, "DLQ" here
  means a malformed/unparseable MQTT message gets logged at `error` and
  dropped (not forwarded) rather than crashing the bridge — a real
  `telemetry.raw.dlq` Kafka topic is deferred alongside Avro, since without
  Avro there's no schema-validation failure mode that would actually route
  there; the only failure mode at this stage is "not valid JSON," which never
  reaches Kafka at all.

## Files to create

**`libs/contracts/`** (new shared lib, mirrors `libs/observability`'s package shape):
- `package.json` — no runtime deps; ESM; `build`/`test` scripts mirroring `libs/observability`.
- `tsconfig.json` / `tsconfig.build.json` — same `nodenext` + strict settings as `libs/observability`.
- `src/telemetry/telemetry-message.ts` — `Position` and `TelemetryMessage`, moved verbatim from `device-simulator`.
- `src/index.ts` — barrel export.

**`apps/device-simulator/`** (modify, not create):
- Delete `src/telemetry/telemetry-message.ts`; import `Position`/`TelemetryMessage` from `@herdlink/contracts` instead everywhere it's used (`gps-walk.ts`, `battery.ts` via `RandomFn` only — unaffected, `simulator.ts`, `mqtt-publisher.ts`, spec files).
- `package.json` — add `@herdlink/contracts: file:../../libs/contracts` dependency; add the Jest `moduleNameMapper` entry mirroring the `@herdlink/observability` one.

**`apps/mqtt-bridge/`** (plain Node/TS, ESM — mirrors `device-simulator`'s tooling exactly):
- `package.json` — deps: `mqtt`, `kafkajs`, `@herdlink/observability`, `@herdlink/contracts`; same devDeps/scripts shape as `device-simulator`.
- `tsconfig.json` / `tsconfig.build.json` — identical to `device-simulator`'s (full strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`).
- `eslint.config.mjs` — identical to `device-simulator`'s.
- `src/instrument.ts` — `initTracing({ serviceName: 'mqtt-bridge' })`.
- `src/config/env.ts` — `validateEnv`, vars: `MQTT_BROKER_URL` (default `mqtt://localhost:1883`), `MQTT_TOPIC` (default `herdlink/telemetry/#`), `KAFKA_BROKERS` (default `localhost:9092`), `KAFKA_CLIENT_ID` (default `mqtt-bridge`), `HEALTH_PORT` (default `3011`), `LOG_LEVEL`.
- `src/kafka/telemetry-producer.ts` — thin wrapper around a `kafkajs` producer: connect/disconnect, `publish(message: TelemetryMessage)` sending to `telemetry.raw` with key = `deviceId`, `acks: 'all'`, headers (`correlationId`, `schema-version: '1'`). Mirrors `MqttPublisher`'s shape (constructor-injected `kafka` client factory for testability, same pattern used in `device-simulator`).
- `src/mqtt/telemetry-subscriber.ts` — thin wrapper around `mqtt.connect`: subscribes to `MQTT_TOPIC` (wildcard), connect/error/close logging, emits parsed `TelemetryMessage`s via an injected handler callback; malformed JSON is logged at `error` and dropped, not forwarded. Same DI pattern as `device-simulator`'s `MqttPublisher` (`connect` injectable).
- `src/bridge.ts` — orchestrator: wires the subscriber's handler to call the producer's `publish`; tracks last-seen-healthy state for both connections.
- `src/main.ts` — entrypoint: `instrument.ts` first, `validateEnv`, `createLogger`, `/health` HTTP server (200 only when *both* MQTT and Kafka report connected), construct producer + subscriber + bridge, `SIGTERM`/`SIGINT` (disconnect both clients, `shutdownTracing()`, exit 0), top-level `unhandledRejection`/`uncaughtException` handlers.
- `Dockerfile` — mirrors `device-simulator`'s, but copies `libs/contracts` too (not just `libs/observability`).
- Tests co-located: `telemetry-producer.spec.ts` (fake `kafkajs` producer via DI), `telemetry-subscriber.spec.ts` (fake MQTT client via DI, malformed-payload handling), `bridge.spec.ts` (wiring test — a subscribed message results in exactly one publish call).

**`apps/mqtt-bridge/docs/`** — via the `/new-service`-style scaffold (README/ENDPOINTS/NETWORK/CHANGELOG/TODO from `docs/templates/service/`), filled in.

**`docs/adr/0004-mqtt-bridge-plain-node-script-and-json-telemetry.md`** — records both resolved decisions (framework shape, JSON-before-Avro) with the reasoning above.

## Files to modify

- **`docker-compose.yml`** — uncomment the `kafka` service block only (not `schema-registry` — deferred with Avro); add a `mqtt-bridge` service block mirroring `device-simulator`'s (repo-root build context, `depends_on: mosquitto` + `kafka` both healthy, env vars, dev bind-mount).
- **`docs/ROADMAP.md`** — `mqtt-bridge` row: `⬜ Not started` → `✅ Built`; `libs/contracts` row: `⬜ Not started` → `✅ Built`.
- **`CLAUDE.md`** — repo map line: add `mqtt-bridge` to built services.
- **`.cursor/rules/distributed-systems.mdc`** — correct the correlation-ID line to reflect that `device-simulator` (the actual edge) generates it, not `mqtt-bridge` — small, factual doc fix alongside the code that surfaced the discrepancy.

## Verification

1. `npm run lint` / `npm test` in `apps/mqtt-bridge` and `apps/device-simulator` (post-refactor) — all pass.
2. `docker compose up mosquitto kafka mqtt-bridge device-simulator` — confirm both `connect` log lines (MQTT + Kafka) and `/health` returns 200.
3. Manual check: a Kafka consumer (`kafka-console-consumer` or Kafka UI once uncommented) on `telemetry.raw` shows one JSON message every ~30s matching `TelemetryMessage`, keyed by `deviceId`.
4. Malformed-payload check: publish a non-JSON message directly to `herdlink/telemetry/manual-test` via `mosquitto_pub` — confirm `mqtt-bridge` logs an error and does *not* crash or forward garbage to Kafka.
5. Restart check: stop `kafka`, confirm `mqtt-bridge` logs reconnect attempts without crashing (mirrors `device-simulator`'s MQTT resilience check, same principle applied to the Kafka producer side).
