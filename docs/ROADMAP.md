# HerdLink — Build Status Board

> The single glance-able answer to "what is built and what remains" at the **platform** level.
> Per-service detail lives in each service's `apps/<service>/docs/TODO.md`. Milestone definitions live in [PRD.md §8](./PRD.md#8-milestones).
> Keep this current: `/sync-specs` updates the touched service's row; `/status` reconciles this board against per-service TODOs.

**Legend:** ✅ Built · 🚧 In progress · ⬜ Not started

_Last reconciled: 2026-08-17_

## Services

| # | Service | Milestone | Status | Specs | Notes |
|---|---|---|---|---|---|
| 1 | `device-simulator` | M1 | ✅ Built | [docs](../apps/device-simulator/docs/) | Single simulated collar (`SIM-000001`); publishes to `herdlink/telemetry/<deviceId>` over MQTT every 30s; multi-device fan-out is M2 |
| 2 | `mqtt-bridge` | M1 | ⬜ Not started | — | |
| 3 | `ingestion-service` | M1 | ⬜ Not started | — | |
| 4 | `geofence-engine` | M2 | ⬜ Not started | — | |
| 5 | `alerting-service` | M3 | ⬜ Not started | — | |
| 6 | `device-service` | M2 | ✅ Built | [docs](../apps/device-service/docs/) | REST CRUD for devices + fences; JWT-protected writes; demo `POST /api/v1/auth/login` |
| 7 | `realtime-gateway` | M1 → M3 | ⬜ Not started | — | WebSocket fan-out; JWT in M3 |
| 8 | `dashboard-api` | M3 | ⬜ Not started | — | GraphQL BFF |
| 9 | `dashboard-ui` | M1 → M3 | 🚧 In progress | [docs](../apps/dashboard-ui/docs/) | Portal shell + devices/fences/login wired to `device-service` REST (Vite proxy); placeholder fence geometry; map + live WS still pending |

## Shared libraries (`libs/`)

| Library | Status | Notes |
|---|---|---|
| `auth` | ✅ Built | Shared JWT verification and issuance — [`libs/auth/`](../libs/auth/) |
| `kafka-client` | ⬜ Not started | Kafka utilities + schema registry |
| `observability` | ✅ Built | Pino + OpenTelemetry setup — [`libs/observability/`](../libs/observability/) |
| `contracts` | ⬜ Not started | Shared types + Avro schemas |

## Cross-cutting infrastructure

| Item | Status | Notes |
|---|---|---|
| Docker Compose (Mosquitto, Kafka, Redis, Postgres+Timescale, Mongo) | 🚧 In progress | `docker-compose.yml` present at root |
| Jaeger / OpenTelemetry | 🚧 In progress | `infra/jaeger/` present |
| Prometheus + Grafana | 🚧 In progress | `infra/prometheus/`, `infra/grafana/` present |
| k6 load tests | ⬜ Not started | `load-tests/k6/` (M4) |
| CI (GitHub Actions) | ⬜ Not started | M4 |

## Milestone progress

| Milestone | Goal | Status |
|---|---|---|
| M1 — Walking skeleton | One device end-to-end onto a map | 🚧 In progress (device-simulator done; mqtt-bridge, ingestion-service, realtime-gateway remain) |
| M2 — Scale, geofences, domain | 1,000 devices; fences detect breaches | 🚧 In progress (device-service done) |
| M3 — Alerting, GraphQL, production patterns | Full alerting; dashboard ops tool; graceful failure | ⬜ Not started |
| M4 — Observability, load testing, polish | System tells its own story | ⬜ Not started |
