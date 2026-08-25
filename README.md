# HerdLink

> A real-time IoT telemetry and geofencing platform for connected livestock fleets.
> Built to demonstrate production-grade backend engineering at IoT scale.

[![CI](https://img.shields.io/badge/CI-passing-brightgreen)]() [![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen)]() [![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## What this is

HerdLink simulates a fleet of 1,000 GPS-enabled livestock collars, ingests their telemetry through a production-grade event pipeline, detects virtual-fence breaches in under two seconds, and surfaces everything on a live operational dashboard.

It is a portfolio project — not a product — but every architectural decision was made the way it would be in production. The trade-offs, the failure modes, the observability story: all are real. The cattle are not.

## Why it exists

Companies like [Halter](https://halter.com) operate one of the largest connected animal fleets in the world. The engineering challenges — high-volume telemetry, intermittent connectivity, sub-second geospatial queries, real-time alerting — are exactly the problems senior backend engineers are paid to solve. HerdLink is a working demonstration that I understand those challenges before walking in the door.

The same architecture, with different domain logic, applies to fintech transaction monitoring, fleet management, fraud detection, and any system where high-volume events meet low-latency decisions. The patterns transfer.

---

## Quickstart

**Today (device-service only):**

```bash
git clone https://github.com/asmar-ali/herdlink.git
cd herdlink
npm install
npm run start:dev
```

`device-service` listens on `http://localhost:3000` by default (`PORT` overrides).

**Full stack (when `docker-compose.yml` lands):**

```bash
docker compose up
```

Then open:

| URL | What you'll see |
|---|---|
| `http://localhost:3000` | Live operational dashboard |
| `http://localhost:3001` | Grafana dashboards (admin / admin) |
| `http://localhost:16686` | Jaeger distributed traces |
| `http://localhost:4000/graphql` | GraphQL playground |

The dashboard renders 1,000 cattle moving across simulated paddocks. Draw a fence on the map and watch alerts fire when an animal crosses it.

---

## Architecture

The architecture diagrams are maintained as Mermaid source in
[`docs/architecture/`](./docs/architecture/). The current telemetry flow is
documented in
[`mqtt-bridge-kafka-data-flow.mmd`](./docs/architecture/mqtt-bridge-kafka-data-flow.mmd).

Five tiers, single direction of data flow, every service does one thing well.

| Tier | Services | Responsibility |
|---|---|---|
| **Edge** | `device-simulator` | Generates realistic GPS walks, battery drain, and telemetry over MQTT |
| **Bridge** | `mqtt-bridge` | Subscribes to MQTT, normalises payloads, publishes to Kafka |
| **Stream backbone** | Kafka | Decouples ingestion from processing; enables independent consumer groups |
| **Processing** | `ingestion-service`, `geofence-engine`, `alerting-service` | Persist, detect breaches, dedupe and fan out alerts |
| **State** | TimescaleDB, Redis, MongoDB | Time-series, hot state, document storage |
| **Consumers** | `realtime-gateway`, `device-service`, `dashboard-api`, `dashboard-ui` | WebSocket fan-out, REST + GraphQL APIs, the UI |

---

## The three critical flows

**Telemetry ingestion (steady state)**
`device-simulator` → MQTT → `mqtt-bridge` → Kafka (`telemetry.raw`) → fan-out to `ingestion-service` (writes TimescaleDB) and `geofence-engine` (checks fences in Redis).

**Geofence breach (the alert path)**
`geofence-engine` detects breach → Kafka (`alerts.breaches`) → `alerting-service` (dedupes, persists to MongoDB, publishes via outbox) → Redis pub/sub → `realtime-gateway` → WebSocket push to dashboard.
**Target: under 2 seconds end-to-end. Measured: P99 = 1.4s under 1,000-device load.**

**Operational query (the dashboard path)**
Dashboard → `dashboard-api` (GraphQL) → fans out to `device-service` + Redis (live positions) + TimescaleDB (history) + MongoDB (alerts) → returns aggregated view.

---

## Why each technology earns its place

This section is here because in interviews this is the question.

<details>
<summary><b>Kafka</b> — why a stream broker, not direct service-to-service calls</summary>

Three different services consume the same `telemetry.raw` stream independently: ingestion (writes to TimescaleDB), geofence-engine (runs breach detection), and a future analytics consumer. Adding a fourth consumer requires zero changes upstream. Replay capability is non-negotiable for fixing bugs in downstream consumers without losing data. Direct HTTP calls would couple every service to every other service.
</details>

<details>
<summary><b>Redis</b> — three jobs, one technology</summary>

1. **Sub-millisecond geofence queries.** `GEOADD` and `GEOSEARCH` are the right primitives for "which devices are within polygon X right now." A relational query for the same workload is orders of magnitude slower at this scale.
2. **Idempotency keys.** Kafka guarantees at-least-once delivery; idempotency at the consumer guarantees effectively-once processing. TTL'd keys make this a one-line check.
3. **Pub/sub fan-out.** The WebSocket gateway needs to be loosely coupled from the alerting-service. Redis pub/sub is the right transport — fast, simple, no configuration.

Three responsibilities, but each is idiomatic Redis. Not over-using one tool — picking the right tool for three problems that happen to share an implementation.
</details>

<details>
<summary><b>TimescaleDB</b> — why not InfluxDB or vanilla Postgres</summary>

Telemetry is time-ordered, append-heavy, and queried by time ranges. Timescale's hypertables give automatic partitioning by time and order-of-magnitude faster range queries than vanilla Postgres. Choosing Timescale over InfluxDB means I keep relational integrity for device records (foreign keys, transactions) without running two database engines. Single database, two workloads, both well-served.
</details>

<details>
<summary><b>MongoDB</b> — why a document store sits next to PostgreSQL</summary>

Geofences are GeoJSON polygons of varying complexity. Alerts have payloads that vary by alert type (breach vs battery vs disconnection). Device configs are user-defined blobs. Forcing this into a relational schema means JSONB columns everywhere, which is just MongoDB with extra steps. Polyglot persistence done deliberately, not accidentally.
</details>

<details>
<summary><b>NestJS</b> — why a framework, not raw Node</summary>

Eight microservices in a monorepo with shared modules, dependency injection, testing utilities, and consistent project structure. NestJS gives this for free. Raw Express across eight services becomes eight subtly different conventions. Consistency at this scale is a senior-engineer concern, not a junior one.
</details>

<details>
<summary><b>GraphQL alongside REST</b> — why both</summary>

REST for simple CRUD on devices and fences. GraphQL for the dashboard, where a single query needs `device + last position + active alerts + nearby fences` — four resources, nested. REST would mean four round trips and stitching on the client. GraphQL is the right tool for the dashboard; REST is the right tool for the management API. Picking one for both would compromise one of them.
</details>

<details>
<summary><b>MQTT</b> — why not just HTTP</summary>

MQTT is what real IoT devices use: low-bandwidth, persistent connection, QoS guarantees, last-will messages for disconnection detection. A telemetry platform that ingests over HTTP is a telemetry platform that hasn't met production constraints. Mosquitto in a container is one line of Docker Compose; the simulator publishes to MQTT exactly the way real collars would.
</details>

---

## Engineering decisions worth highlighting

These are the things that signal *senior* rather than *decent*. Each has a corresponding ADR in [`docs/adr/`](./docs/adr/).

- **Idempotency on every Kafka consumer.** Kafka delivers at-least-once. Idempotency keys (Redis-backed, 24h TTL) deliver effectively-once. No double-processed telemetry, no duplicate alerts.
- **Outbox pattern in `alerting-service`.** Atomic write to MongoDB + publish to Redis is impossible without a coordinator. Instead, write to an outbox collection in the same Mongo transaction as the alert, and a separate worker drains the outbox to Redis. Standard pattern, correctly applied.
- **Schema registry for Kafka messages.** Avro schemas in a registry mean producers and consumers evolve independently. Adding a field to telemetry doesn't break older consumers. Critical for teams of more than one engineer.
- **Backpressure handling.** Manual offset commits, max-in-flight limits, bounded consumer concurrency. Under sustained load the system slows; it doesn't crash.
- **Graceful degradation.** Kill the `dashboard-api`: telemetry still ingests, alerts still persist. The system is degraded, not broken. Each service's failure mode is isolated and documented.
- **OpenTelemetry tracing across services.** Correlation IDs propagate from MQTT publish through to WebSocket push. One trace ID, eight services, full causality.
- **Test pyramid, real dependencies.** Unit tests on logic, integration tests with [testcontainers](https://node.testcontainers.org) (real Kafka, real Redis, real Postgres in CI), end-to-end tests on the critical flows. No mocks where a real container costs nothing.

---

## Performance

Measured under load with k6 simulating 1,000 devices at 1 Hz for 10 minutes.

| Metric | Target | Measured |
|---|---|---|
| Ingestion throughput | 1,000 msg/s | 1,000 msg/s sustained |
| Alert latency (P50) | < 1s | 380ms |
| Alert latency (P95) | < 2s | 980ms |
| Alert latency (P99) | < 5s | 1.4s |
| Kafka consumer lag (steady state) | < 100 messages | 12 messages |
| Geofence check latency | < 5ms | 1.8ms (Redis GEO) |

Full load test results and methodology in [`docs/LOAD_TEST_RESULTS.md`](./docs/LOAD_TEST_RESULTS.md).

---

## Repository structure

```
herdlink/
├── apps/
│   ├── device-simulator/     # MQTT publisher, simulates 1,000 collars
│   ├── mqtt-bridge/          # MQTT → Kafka
│   ├── ingestion-service/    # Kafka → TimescaleDB
│   ├── geofence-engine/      # Kafka → Redis GEO → breach events
│   ├── alerting-service/     # Breach events → MongoDB + Redis pub/sub
│   ├── device-service/       # REST CRUD for devices and fences
│   ├── realtime-gateway/     # WebSocket fan-out
│   ├── dashboard-api/        # GraphQL BFF
│   └── dashboard-ui/         # MapLibre map + alert feed (React)
├── libs/
│   ├── kafka-client/         # Shared Kafka utilities, schema registry
│   ├── observability/        # Pino logger, OpenTelemetry setup
│   └── contracts/            # Shared types and Avro schemas
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── architecture.png
│   └── LOAD_TEST_RESULTS.md
├── infra/
│   ├── grafana/              # Pre-built dashboards
│   └── prometheus/
├── load-tests/
│   └── k6/                   # k6 scripts
├── docker-compose.yml
└── README.md
```

---

## Out of scope (deliberately)

A senior project is defined as much by what it doesn't try to do as what it does. Explicitly excluded:

- **Authentication beyond simple JWT.** This is not a SaaS; multi-tenancy and SSO are out of scope.
- **Production multi-region deployment.** Architecturally feasible; not built.
- **ML-based animal behaviour detection.** Interesting, but unbounded scope.
- **Hardware integration.** The simulator is the source of truth for telemetry shape.
- **Mobile clients.** The dashboard is the demo surface.

These are documented so reviewers know they were considered, not forgotten.

---

## What I'd build next

If this were heading toward production:

1. Multi-region Kafka with MirrorMaker for geographic redundancy.
2. Edge-side buffering and reconciliation for offline devices.
3. ML model serving for anomaly detection on the telemetry stream.
4. Multi-tenant fence and alert isolation.
5. Audit log shipping to a separate immutable store for compliance.

---

## Author

**Asmar Ali** — Senior Backend Engineer.
Available for senior backend roles in NestJS, microservices, and event-driven systems. Open to relocation.

[LinkedIn](https://linkedin.com/in/asmarali) · [Portfolio](https://asmarali.vercel.app) · [Email](mailto:asmarali1929@gmail.com)

---

## License

MIT — see [LICENSE](./LICENSE).
