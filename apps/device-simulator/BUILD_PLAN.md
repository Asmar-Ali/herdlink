# device-simulator — M1 build plan

## Context

`device-simulator` is service #1 in the PRD's 9-service architecture and the first deliverable of **M1 — Walking skeleton** ("one device's telemetry flows end-to-end onto a map"). Nothing downstream (`mqtt-bridge`, `ingestion-service`, `realtime-gateway`, `dashboard-ui`) can be built or tested without a real data source, and this service defines the telemetry payload shape everything else consumes (PRD: "the simulator is the source of truth for telemetry shape"). Scope for this pass is **1 collar**, not 1,000 — the multi-device fan-out is M2's job.

Before planning, a brainstorm pass surfaced several gaps not resolved anywhere in the docs (no `mqtt.mdc`, no `libs/contracts`, a PRD/README frequency contradiction, undocumented coupling to `device-service`'s seed data). The user resolved the four load-bearing ones directly:

| Decision | Resolution |
|---|---|
| Publish cadence | **30s**, per PRD (canonical; README's "1 Hz" claim is a pre-existing doc inconsistency, out of scope to fix here) |
| Device identity | **Reuse seeded device** `SIM-000001` / `herdId: herd-demo-1`, positioned inside device-service's pre-seeded "Demo Paddock 1" |
| Offline/reconnect simulation | **Deferred** — no M1 deliverable needs it, no downstream reconciliation consumer exists yet |
| Service shape | **Plain Node/TS script**, not NestJS — it's a publish-only worker with no HTTP surface or DI consumers |

Remaining lower-level details (MQTT topic scheme, QoS, payload schema, health-check shape, battery model) had no stakeholder decision to make — they're settled below using existing repo conventions.

## Key research findings (from `.cursor/rules/nodejs.mdc`, `libs/observability`, `docs/templates/service/`, device-service's package.json/Dockerfile)

- **Not an npm workspace monorepo** — every app is a standalone npm package; libs are consumed via `file:../../libs/<lib>` deps installed as real copies.
- **`libs/observability` is usable directly from a plain script**: `createLogger({ serviceName })` returns a plain `pino.Logger`; `initTracing({ serviceName })` (from the `./instrumentation` subpath) bootstraps OpenTelemetry and must be the first import in the entrypoint — same pattern device-service uses via its `instrument.ts`. Nest-only exports (`createNestLogger`, `ObservabilityModule`, etc.) simply aren't imported.
- **`nodejs.mdc` applies to plain apps** (glob covers `apps/**/*.ts`), and is actually stricter than what device-service's tsconfig enforces (`strict: true`, `noUncheckedIndexedAccess`) — since this service has no NestJS decorator requirement forcing looser settings, it can adopt the `.mdc`'s full strict config properly.
- **`docs/templates/service/NETWORK.md` already has a ready-to-fill MQTT section** (`Broker / Topics / QoS / Last-will`) — no template adaptation needed there. `ENDPOINTS.md`'s template is 100%-HTTP-shaped with no "no endpoints" escape hatch — needs a one-line override.
- **Dockerfile pattern**: build context is the **repo root** (not the app dir) specifically so `file:../../libs/...` resolves; libs copied in before the app's own `package.json` for layer-cache efficiency.
- **`docker-compose.yml`'s `mosquitto` service block is currently fully commented out** — it must be uncommented to have a broker to publish against locally. Flagging this explicitly since it's a compose-file infra change, not just new app code.
- Env validation has no library dependency anywhere in the repo — device-service's `validate-env.ts` is a ~10-line hand-rolled function; mirror that, don't add Joi/Zod.
- No `libs/contracts` exists yet (correctly — it's platform-wide, not this task's scope). The `TelemetryMessage` type lives locally in `device-simulator` for now; promoting it to `libs/contracts` is `mqtt-bridge`'s problem when that service needs to share the shape.

## Decisions being made now (implementation-level, no further sign-off needed)

- **MQTT topic:** `herdlink/telemetry/<deviceId>` (per-device topic — lets future consumers wildcard-subscribe `herdlink/telemetry/#`, and scopes cleanly if per-device ACLs are ever added). Client ID: `device-simulator-<serialNumber>`.
- **QoS:** 1 (at-least-once — consistent with the platform's "idempotent consumer" philosophy already established in `kafka.mdc`; `mqtt-bridge` will need to dedupe same as any Kafka consumer).
- **Retained:** false — telemetry is a stream, not last-known-state; `device-service`'s denormalised `lastLatitude`/`lastLongitude`/`lastSeenAt` already serves the "last known position" role.
- **Last-will:** documented but not wired (offline simulation deferred, so there's nothing to signal yet); `NETWORK.md` records this as a known gap for M2.
- **Payload envelope** (`TelemetryMessage`): `{ deviceId, herdId, timestamp (ISO 8601), position: { lat, lng }, batteryLevel (0–100 int), sequence (monotonic per-process counter), correlationId (ULID) }`. Correlation id travels **inside the payload** (MQTT has no first-class headers) — this matches the one MQTT-specific line in the `designing-event-flows` skill.
- **Start position:** inside device-service's seeded "Demo Paddock 1" (origin `144.9, -37.8`, size `0.008°` → center ≈ `144.904, -37.796`), so a future geofence-engine demo has an animal already inside a fence to walk out of.
- **Health check:** M1's deliverable list names "health checks" as cross-cutting, but this worker has no HTTP API. Rather than pull in NestJS/Express for one route, use Node's built-in `http` module for a single `/health` endpoint (200 while the MQTT client is connected) — satisfies the M1 deliverable and a future Docker healthcheck without adding a framework dependency.
- **Reconnect baseline:** `mqtt.js`'s built-in auto-reconnect (its default behavior) is left enabled as-is. This gives baseline resilience for free without building the custom buffering/reconnect logic that was explicitly deferred.

## Files to create

**`apps/device-simulator/`** (plain Node/TS, ESM, mirrors `libs/observability`'s build tooling rather than device-service's Nest tooling):
- `package.json` — deps: `mqtt`, `ulid`, `@herdlink/observability` (`file:../../libs/observability`); devDeps mirrored from device-service minus everything Nest-specific (`typescript`, `eslint` + `typescript-eslint` + prettier plugins, `jest`, `ts-jest`, `@types/node`), plus `tsx` for dev-watch. Scripts: `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/main.js`), `start:dev` (`tsx watch src/main.ts`), `lint`, `test`. Jest config mirrors `libs/observability`'s ESM preset (`ts-jest/presets/default-esm`), not device-service's CommonJS one.
- `tsconfig.json` / `tsconfig.build.json` — `module`/`moduleResolution: nodenext`, and (unlike device-service) full `strict: true` + `noUncheckedIndexedAccess` per `nodejs.mdc`, since there's no decorator-metadata constraint forcing it looser.
- `src/instrument.ts` — one line: `initTracing({ serviceName: 'device-simulator' })`, imported first in `main.ts`.
- `src/config/env.ts` — typed config + a `validateEnv` mirroring `device-service/src/config/validate-env.ts`'s shape. Vars: `MQTT_BROKER_URL` (default `mqtt://localhost:1883`), `DEVICE_SERIAL_NUMBER` (default `SIM-000001`), `DEVICE_HERD_ID` (default `herd-demo-1`), `PUBLISH_INTERVAL_MS` (default `30000`), `START_LAT`/`START_LNG` (defaults `-37.796`/`144.904`), `WALK_STEP_DEGREES` (small default, e.g. `0.0001`), `HEALTH_PORT` (default `3010`), `LOG_LEVEL`.
- `src/telemetry/telemetry-message.ts` — the `TelemetryMessage` interface described above.
- `src/telemetry/gps-walk.ts` — pure function `nextPosition(current, stepDegrees, rng)`: bounded random-walk step, RNG injected for testability.
- `src/telemetry/battery.ts` — pure function `nextBatteryLevel(current, rng)`: gradual drain with jitter, floors at a configurable minimum (documented simplification: no LOST-status transition here — that's `device-service`/ingestion's concern later).
- `src/mqtt/mqtt-publisher.ts` — thin wrapper around `mqtt.connect`: connect/error/close logging, `publish(message)` building the topic from `deviceId`, QoS 1, retain false.
- `src/simulator.ts` — orchestrator: recursive `setTimeout` tick loop (not raw `setInterval`, to avoid overlap if a publish is slow), composes position + battery + message, calls the publisher, logs each tick.
- `src/main.ts` — entrypoint: `import './instrument.js'` first, `validateEnv`, `createLogger`, wire the health HTTP server, construct publisher + simulator, start the loop; `SIGTERM`/`SIGINT` handlers (stop loop, `mqtt.end()`, `shutdownTracing()`, exit 0); top-level `unhandledRejection`/`uncaughtException` handlers per `nodejs.mdc`.
- `Dockerfile` — mirrors `apps/device-service/Dockerfile`'s structure (repo-root build context, libs copied first, `npm ci`, then app source) but `CMD ["node", "dist/main.js"]`, `EXPOSE` only the health port (no MQTT server port to expose).
- Tests co-located as `*.spec.ts`: `gps-walk.spec.ts`, `battery.spec.ts`, `mqtt-publisher.spec.ts` (mocking `mqtt.connect`), `simulator.spec.ts` (fake timers + mocked publisher).

**`apps/device-simulator/docs/`** — scaffold via the existing `/new-service device-simulator` command (reuses `docs/templates/service/*`, registers in `ROADMAP.md`), then fill in specifics:
- `NETWORK.md` — fill the existing MQTT section (broker, topic pattern, QoS 1, last-will: no/deferred); delete the Kafka/sync-call/datastore sections (none apply).
- `ENDPOINTS.md` — template has no "no HTTP surface" case; replace body with a one-line note plus a pointer to `NETWORK.md`'s health-port entry.
- `README.md`, `CHANGELOG.md`, `TODO.md` — filled per the standard template (tier: Edge, milestone M1), noting offline/reconnect simulation as explicitly deferred to M2+ in `TODO.md`.

**`docs/adr/0002-device-simulator-plain-node-script.md`** — records the NestJS-deviation decision (publish-only worker, no HTTP/DI consumers, so plain Node/TS is the better fit than forcing Nest's module/controller scaffolding).

**`.cursor/rules/mqtt.mdc`** (new standard, not an ADR — this convention will be reused by `mqtt-bridge` later) — documents topic pattern, QoS/retain conventions, client-ID scheme, and the "correlation id lives in the payload, not headers" rule, so it's the authoritative reference the next MQTT-touching service reads.

## Files to modify

- **`docker-compose.yml`** — uncomment the `mosquitto` service block (currently fully commented, lines ~182–199); add a new `device-simulator` service block mirroring `device-service`'s app block (repo-root build context, `depends_on: mosquitto` healthy, env vars for broker URL/device identity/interval, dev bind-mount for live reload). **Flagging explicitly: this brings up a new container** — will confirm before applying if that wasn't already implied by "build the service."
- **`docs/ROADMAP.md`** — `device-simulator` row: `⬜ Not started` → `✅ Built`, link specs, note.
- **`CLAUDE.md`** — its first line currently says "Only `device-service` is built so far"; update to include `device-simulator`.

## Verification

1. `npm run lint` / `npm test` in `apps/device-simulator` — unit tests pass (gps-walk bounded-step math, battery monotonic drain, publisher topic/QoS correctness, simulator tick composition).
2. `docker compose up mosquitto device-simulator` (or full stack) — confirm the container connects (`connect` log line) and the `/health` endpoint returns 200.
3. Manual end-to-end check: `mosquitto_sub -h localhost -t 'herdlink/telemetry/#' -v` against the running compose stack — confirm one JSON message every ~30s with the expected `TelemetryMessage` shape, moving position, draining battery.
4. `docker compose stop mosquitto` then restart it — confirm the simulator's log shows a `reconnect`/`connect` cycle (validates the "baseline resilience via mqtt.js defaults" decision) without crashing.
