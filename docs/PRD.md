# HerdLink — Product Requirements Document

> Status: Living document. This is the canonical reference for *what* HerdLink is and *why*.
> Source material: [`HerdLink_Project_Plan.pdf`](../HerdLink_Project_Plan.pdf) (the original blueprint) and [`README.md`](../README.md) (the public pitch). When they disagree, this PRD wins — update it deliberately.
> Companion docs: build status in [ROADMAP.md](./ROADMAP.md), the process in [DEVELOPMENT_LIFECYCLE.md](./DEVELOPMENT_LIFECYCLE.md), decisions in [adr/](./adr/), full tech-stack rationale in [TECH_STACK.md](./TECH_STACK.md).

---

## 1. Summary

HerdLink is a real-time IoT telemetry and geofencing platform for connected livestock fleets. It ingests high-volume GPS/sensor telemetry from a simulated fleet of 1,000 collars, computes virtual-fence breaches in real time, alerts operators within seconds, and serves both live operational dashboards and historical queries — with the resilience and observability expected of production systems.

It is a portfolio project, not a commercial product, but every architectural decision is made the way it would be in production. The patterns generalise: swap cattle for transactions and fences for fraud rules and the same event-driven pipeline applies to fintech, fleet management, and ride-hailing.

## 2. Problem

Pasture-based livestock farming is operationally chaotic and reactive: herds spread across hundreds of hectares are monitored by humans on quad bikes. Smart collars emit continuous telemetry that *should* enable proactive operations, but the engineering is non-trivial:

| Challenge | Detail |
|---|---|
| **Scale** | ~1,000 collars × 1 msg / 30s ≈ 3M events/day per farm. Multiply by many farms. |
| **Connectivity** | Rural cellular is patchy. Devices buffer offline and reconcile on reconnect. |
| **Latency-sensitive** | A cow breaching a fence onto a road needs an alert in seconds, not minutes. |
| **Geospatial at scale** | Which of N devices is inside which of M polygons — recomputed every few seconds. |
| **Mixed data shapes** | Time-series telemetry, JSON configs, polygon geometry, audit logs. |
| **Operational visibility** | Live map + historical analytics + alerting, in one pane. |

**Problem in one sentence:** build a backend platform that ingests high-volume IoT telemetry, computes virtual-fence breaches in real time, alerts operators within seconds, and supports historical querying and live dashboards — with production-grade resilience and observability.

## 3. Goals & non-goals

### Goals
- Ingest telemetry end-to-end from edge → storage with no data loss under sustained load.
- Detect geofence breaches and deliver alerts end-to-end in **under 2 seconds (P95)**.
- Serve live positions and historical analytics to an operational dashboard.
- Demonstrate production engineering: idempotency, outbox, schema evolution, backpressure, graceful degradation, distributed tracing, and a real test pyramid.
- Be reproducible: `docker compose up` brings the whole system online; the README is readable end-to-end in five minutes.

### Non-goals (deliberately out of scope)
- Authentication beyond simple JWT — this is not a SaaS.
- Multi-tenancy, SSO, production multi-region deployment.
- ML-based animal-behaviour detection.
- Hardware integration — the simulator is the source of truth for telemetry shape.
- Mobile clients — the dashboard is the demo surface.

These are recorded so reviewers know they were considered, not forgotten.

## 4. Architecture overview

Five tiers, single direction of data flow, every service does one thing well. Full topology and the technology justifications live in [`README.md`](../README.md#architecture); the diagram is `docs/architecture.png` (to be added).

| Tier | Services | Responsibility |
|---|---|---|
| **Edge / source** | `device-simulator` | Generates realistic GPS walks, battery drain, telemetry over MQTT |
| **Bridge** | `mqtt-bridge` | Subscribes to MQTT, normalises payloads, publishes to Kafka |
| **Stream backbone** | Kafka | Decouples ingestion from processing; independent consumer groups + replay |
| **Processing** | `ingestion-service`, `geofence-engine`, `alerting-service` | Persist telemetry, detect breaches, dedupe + fan out alerts |
| **State** | TimescaleDB, Redis, MongoDB | Time-series, hot state, document storage |
| **Consumers** | `realtime-gateway`, `device-service`, `dashboard-api`, `dashboard-ui` | WebSocket fan-out, REST + GraphQL APIs, the UI |

### The 9 services

| # | Service | Responsibility | Primary stores |
|---|---|---|---|
| 1 | `device-simulator` | Spawns N virtual collars; realistic GPS random-walk + battery; publishes to MQTT | — |
| 2 | `mqtt-bridge` | Subscribes to MQTT, normalises, publishes to Kafka `telemetry.raw` | — |
| 3 | `ingestion-service` | Kafka consumer; writes raw telemetry to TimescaleDB; idempotent | TimescaleDB |
| 4 | `geofence-engine` | Kafka consumer; checks each position against fences via Redis GEO; emits breach events | Redis, Mongo (fence cache source) |
| 5 | `alerting-service` | Consumes breaches; deduplicates; persists to Mongo; publishes via outbox to Redis | MongoDB, Redis |
| 6 | `device-service` | CRUD for devices and fences; REST (+ GraphQL later) | PostgreSQL, MongoDB |
| 7 | `realtime-gateway` | WebSocket server; subscribes to Redis pub/sub; fans out to dashboards | Redis |
| 8 | `dashboard-api` | GraphQL BFF; aggregates device + position + alerts + fences | (aggregator) |
| 9 | `dashboard-ui` | Live map + alert feed (React + MapLibre, deliberately thin) | — |

### Shared libraries (`libs/`)
`kafka-client` (Kafka utilities + schema registry), `observability` (Pino + OpenTelemetry), `contracts` (shared types + Avro schemas).

## 5. The three critical flows

**A — Telemetry ingestion (steady state)**
`device-simulator` → MQTT → `mqtt-bridge` → Kafka `telemetry.raw` → fan-out to `ingestion-service` (writes TimescaleDB) and `geofence-engine` (checks fences in Redis).

**B — Geofence breach (the alert path)**
`geofence-engine` detects breach → Kafka `alerts.breaches` → `alerting-service` (dedupes, persists Mongo, publishes via outbox) → Redis pub/sub → `realtime-gateway` → WebSocket push to dashboard. **Target: end-to-end < 2s.**

**C — Operational query (the dashboard path)**
Dashboard → `dashboard-api` (GraphQL) → fans out to `device-service` + Redis (live positions) + TimescaleDB (history) + MongoDB (alerts) → aggregated view.

## 6. Non-functional requirements

### Performance targets (asserted in the k6 load test, not aspirational)
| Metric | Target |
|---|---|
| End-to-end alert latency | P95 < 2s, P99 < 5s under 1,000 devices |
| Ingestion throughput | ~3M events/day per farm sustained, no consumer-lag growth |
| Kafka consumer lag (steady state) | < 1,000 messages (< 10,000 under burst) |
| Dashboard composite GraphQL query | P95 < 500ms |
| Geofence check latency | < 5ms (Redis GEO) |
| Load-test error rate | < 0.1% |

### Reliability & resilience
Idempotent consumers, outbox pattern, DLQs with replay, backpressure (manual offsets + bounded concurrency), circuit breakers on sync calls, graceful degradation (each service's failure mode documented and tested), graceful shutdown with offset commit. Detailed standards: [`reliability-scalability.mdc`](../.cursor/rules/reliability-scalability.mdc), [`distributed-systems.mdc`](../.cursor/rules/distributed-systems.mdc).

### Observability (pre-requisite, not a phase)
Three pillars wired before business code: structured logs (Pino, with `correlationId`/`traceId`), RED + domain metrics (Prometheus), distributed traces (OpenTelemetry → Jaeger) with context propagated across MQTT/Kafka/HTTP/WebSocket. Each service declares an SLI/SLO/error-budget in its `docs/README.md`.

### Security
Simple JWT on authenticated surfaces (WebSocket sessions, mutations). No secrets/PII in logs. No auth beyond JWT (per non-goals).

## 7. Success criteria

- All three critical flows work end-to-end via `docker compose up`.
- Load test passes its assertions; results committed to `docs/LOAD_TEST_RESULTS.md`.
- Grafana dashboards load with data; Jaeger shows a single trace spanning the alert path.
- README readable end-to-end in five minutes; ADRs exist for the 5–6 most interesting decisions.
- Every built service has current colocated specs (endpoints, network, changelog, to-dos).

## 8. Milestones

The roadmap is structured as vertical slices that each end with a working, demonstrable system. Per-service build status lives in [ROADMAP.md](./ROADMAP.md); these are the milestone definitions it tracks against.

| Milestone | Goal | Key deliverables |
|---|---|---|
| **M1 — Walking skeleton** | One device's telemetry flows end-to-end onto a map | Monorepo scaffold; Docker Compose (Mosquitto, Kafka KRaft, Redis, Postgres+Timescale, Mongo); simulator (1 collar); mqtt-bridge; ingestion-service; realtime-gateway; minimal dashboard-ui; Pino wired; health checks |
| **M2 — Scale, geofences, domain** | 1,000 devices moving; fences detect breaches in real time | Simulator → 1,000 collars; geofence-engine (Redis GEO + point-in-polygon); device-service REST CRUD; dashboard renders 1,000 dots + draw-fence; Avro schema registry; idempotency; backpressure; integration tests (testcontainers) |
| **M3 — Alerting, GraphQL, production patterns** | Full alerting pipeline; dashboard becomes an ops tool; graceful failure | alerting-service (dedupe + state machine + outbox); realtime-gateway (JWT, per-client subscriptions); dashboard-api (GraphQL); dashboard alert feed; distributed tracing; circuit breaker; contract tests; **alert latency < 2s instrumented** |
| **M4 — Observability, load testing, polish** | The system tells its own story | Prometheus + Grafana dashboards; k6 load test asserting P99 < 5s; ADRs; CI; README polish; demo recording |

> M1 is the highest-priority de-risking milestone: it proves every integration point. `device-service` (built) belongs to M2.

## 9. Glossary

- **Breach** — a device position crossing outside (or into) a virtual fence polygon.
- **Fence** — a GeoJSON polygon defining a virtual boundary; stored in MongoDB.
- **Telemetry** — a single timestamped collar reading (position, battery, sensors).
- **Outbox** — a collection written in the same transaction as a domain change, drained asynchronously to guarantee at-least-once publish.
- **Idempotency key** — a Redis-backed marker ensuring effectively-once processing of at-least-once-delivered messages.
- **Correlation ID** — a ULID generated at the edge and propagated through every hop for tracing.
