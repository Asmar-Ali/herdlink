# HerdLink — Tech Stack & Design Choices

> The single place to see **every technology, pattern, and design choice** made in this repo, with the reasoning and trade-offs next to it. If you only have five minutes, read the quick-reference table below.
>
> **How this differs from the other docs:**
> - [`PRD.md`](./PRD.md) says *what* we're building.
> - [`docs/adr/`](./adr/) captures the *why* for individual non-obvious decisions, at the point they were made.
> - [`.cursor/rules/*.mdc`](../.cursor/rules/) is the authoritative *how* — implementation-level standards.
> - **This file** is the readable index across all of it: every choice, one place, with pros/cons. It summarizes and links out — it never overrides the `.mdc` files or an ADR. If this file and an `.mdc`/ADR disagree, they win; fix this file.
>
> Legend: ✅ Built & active · 🚧 Built, not yet wired in · ⬜ Decided, not yet built
> _Last reconciled: 2026-07-25_

---

## Quick reference

| Layer | Choice | Status |
|---|---|---|
| Language / runtime | TypeScript, Node 20 LTS, ESM | ✅ |
| Backend framework | NestJS 11 | ✅ |
| Frontend framework | React 19 + Vite 8 + TypeScript | 🚧 |
| Relational / time-series store | TimescaleDB (Postgres 18) | ✅ |
| Document store | MongoDB 8 | ✅ |
| Cache / hot state / pub-sub | Redis 8 | ⬜ |
| Stream backbone | Kafka (KRaft mode, no Zookeeper) | ⬜ |
| Device transport | MQTT (Mosquitto) | ⬜ |
| Schema evolution | Confluent Schema Registry + Avro | ⬜ |
| Sync API style | REST (device management) + GraphQL (dashboard BFF) | 🚧 REST built, GraphQL ⬜ |
| Auth | JWT, shared dev secret, user + service token types | ✅ |
| ORM / data access | TypeORM (Postgres), Mongoose (Mongo) | ✅ |
| Validation | class-validator + class-transformer, global `ValidationPipe` | ✅ |
| Logging | Pino, structured JSON, redaction | ✅ |
| Tracing | OpenTelemetry → OTLP → Jaeger | 🚧 |
| Metrics | Prometheus + Grafana | ⬜ |
| Idempotency | Redis-backed keys, 24h TTL | ⬜ (designed, not built — no consumers yet) |
| Reliable publish | Outbox pattern (`alerting-service`) | ⬜ |
| Distributed transactions | Choreography (event-driven), no 2PC | ⬜ (design decision only) |
| Containerization / local infra | Docker Compose, one file, services commented in as built | ✅ |
| Testing | Jest (backend unit/e2e), Vitest + Testing Library (frontend unit), Playwright (frontend e2e) | ✅ |

---

## Languages & runtime

<details open>
<summary><b>TypeScript + Node 20 LTS, ESM throughout</b></summary>

**Why:** Type safety across a 9-service monorepo where contracts between services matter more than in a single app. Node 20 LTS gives native `fetch`/`AbortController`/`structuredClone` without polyfills. ESM (not CommonJS) is the forward-compatible module system and what modern tooling (Vite, current NestJS) expects.

**Pros**
- Compile-time contract checking on shared types (once `libs/contracts` exists).
- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` catch a large class of runtime bugs before they ship.
- One language across backend and frontend — no context-switching cost, one hiring bar.

**Cons**
- ESM interop with older CommonJS-only npm packages occasionally needs workarounds.
- Build step required everywhere (no direct `.ts` execution in prod).

**Detail:** [`.cursor/rules/nodejs.mdc`](../.cursor/rules/nodejs.mdc)
</details>

<details>
<summary><b>Two different module-resolution conventions: explicit <code>.js</code> specifiers (NestJS) vs bundler resolution (dashboard-ui)</b></summary>

**Decision:** Node-executed services (all NestJS backends) import with explicit `.js` extensions (`import { X } from './x.js'`) under `moduleResolution: "nodenext"`, because Node's native ESM loader requires the specifier to match the compiled output file. `dashboard-ui` is bundled by Vite/esbuild/Rollup, not executed by Node — it keeps Vite's default `moduleResolution: "bundler"` and imports without extensions, matching standard React/Vite convention.

**Why not force one convention everywhere:** fighting Vite's resolver (HMR, asset imports, `.tsx` resolution) to satisfy a consistency rule that has zero functional payoff in a bundler context isn't worth it. A frontend engineer opening `dashboard-ui` should see idiomatic Vite, not a workaround.

**Pros**
- Each part of the stack uses the convention its toolchain actually expects — no fighting the bundler, no fighting Node's resolver.
- `dashboard-ui` is immediately recognizable to any React/Vite developer.

**Cons**
- The rule is no longer "one convention repo-wide" — a reader moving from a NestJS service to `dashboard-ui` sees the import style change with no code-level signal why.

**Detail:** [ADR-0001](./adr/0001-dashboard-ui-vite-module-resolution.md)
</details>

---

## Backend: NestJS

<details open>
<summary><b>NestJS over raw Express/Fastify</b></summary>

**Why:** 9 services in a monorepo need shared conventions — DI, module boundaries, testing utilities, consistent project layout. NestJS provides this out of the box. Raw Express across 9 services becomes 9 subtly different codebases.

**Pros**
- Built-in DI makes swapping implementations (e.g. mocking a repository in tests) trivial.
- Decorator-based structure (`@Controller`, `@Injectable`) keeps layering consistent (controller → service → repository) across every service without re-deriving it each time.
- First-class support for the things this project needs anyway: guards, interceptors, pipes, microservice transports (Kafka, MQTT).

**Cons**
- More ceremony and boilerplate than a minimal Express app for genuinely simple services.
- Framework magic (decorators, module resolution) has a learning curve and can obscure what's happening at runtime.

**Detail:** [`.cursor/rules/nestjs.mdc`](../.cursor/rules/nestjs.mdc)
</details>

<details>
<summary><b>API shape: REST now, GraphQL for the dashboard later</b></summary>

**Decision:** `device-service` exposes REST (`/api/v1/...`, URI versioning) for device/fence CRUD. `dashboard-api` (planned, M3) will expose GraphQL as a BFF, because the dashboard needs `device + last position + active alerts + nearby fences` in one composite query.

**Why both, not one:** REST for simple CRUD is the boring, correct choice — no reason to pay GraphQL's schema/resolver overhead for a single-resource endpoint. GraphQL for the dashboard avoids four round-trips and client-side stitching. Forcing one style onto both use cases would compromise the one it doesn't fit.

**Pros**
- Each API style is used where its strengths actually apply.
- REST management endpoints stay simple, cacheable, and easy to test with `supertest`.
- Dashboard gets exactly the shape it needs in one request, keeping the P95 < 500ms composite-query target reachable.

**Cons**
- Two API paradigms in one platform means two sets of client tooling, docs, and testing patterns.
- `dashboard-api` becomes a second place business rules could leak into if boundaries aren't kept clean (it should stay a thin aggregator).

**Detail:** [PRD.md §4](./PRD.md#4-architecture-overview)
</details>

<details>
<summary><b>Response envelope, pagination, versioning conventions</b></summary>

**Decision:** Every successful REST response is wrapped `{ data, meta: { timestamp, correlationId } }` (`ResponseInterceptor`). Lists put a `{ items, pagination }` shape inside `data`. Global prefix `api` + URI versioning → all routes are `/api/v1/...`.

**Why:** A caller can rely on one envelope shape for every endpoint in every service — no per-endpoint guessing about whether a field is top-level or nested. Versioning in the URI (not headers) is the simplest thing that works and is visible in every log line and browser request.

**Pros:** consistent client-side handling; correlation ID travels with every response for debugging; adding `/v2` later doesn't require a new host or breaking change to `/v1` clients.

**Cons:** envelope adds a small amount of nesting/boilerplate to every response; URI versioning means the version is baked into every route string.
</details>

---

## Frontend: dashboard-ui

<details open>
<summary><b>React 19 + Vite 8 + TypeScript</b></summary>

**Why:** The dashboard's job is a live map + alert feed — a component-driven, client-rendered SPA is the right shape, and React is the most common choice reviewers/interviewers will recognize instantly. Vite gives fast HMR and a modern build without hand-rolled Webpack config.

**Pros:** huge ecosystem (MapLibre, TanStack Query, react-hook-form all have first-class React bindings); Vite's dev server is fast enough that iteration isn't a bottleneck; TypeScript keeps the API contract with `device-service`/`dashboard-api` checked.

**Cons:** SPA means an extra hop (client-side routing, hydration-free but still a JS bundle) versus SSR; React's ecosystem churn means dependency versions need periodic attention.
</details>

<details>
<summary><b>Supporting libraries: TanStack Query, react-hook-form + zod, react-router-dom, Tailwind v4</b></summary>

**Why each:**
- **TanStack Query** — server state (device lists, positions, alerts) is cache/fetch/refetch state, not `useState`. Query handles loading/error/stale-while-revalidate for free.
- **react-hook-form + zod** — form state performance (uncontrolled inputs) plus a schema that can be shared for both client-side validation and documenting the expected shape.
- **react-router-dom** — standard client-side routing for a multi-page dashboard (map, alerts, device management, login).
- **Tailwind v4** — utility-first styling with no separate CSS-file sprawl across components; fast to iterate on a UI that's "deliberately thin" per the PRD.

**Pros:** each library solves exactly one problem well; all four are the current default choice for this stack, so onboarding cost is low.

**Cons:** four extra dependencies to keep patched; Tailwind's utility classes can make markup noisy if not disciplined about extracting components.
</details>

<details>
<summary><b>Testing: Vitest + Testing Library (unit), Playwright (e2e)</b></summary>

**Why:** Vitest shares Vite's config and transform pipeline, so no separate Jest/Babel setup to maintain for the frontend. Testing Library forces tests to interact with the DOM the way a user would rather than reaching into component internals. Playwright drives a real browser for the flows that matter (login, map interaction).

**Pros:** fast unit test runs (Vitest reuses Vite's transform cache); Playwright catches real browser-rendering issues unit tests can't.

**Cons:** a second test runner (Vitest) alongside Jest (backend) means two configs and two mental models across the monorepo.
</details>

---

## Data stores — polyglot persistence

<details open>
<summary><b>Three datastores, one job each: TimescaleDB, MongoDB, Redis</b></summary>

**Decision:** No shared database, no single "do everything" store. Each store is chosen for a workload it's genuinely good at, and each service owns its own tables/collections — no cross-service reads.

| Store | Workload | Status |
|---|---|---|
| TimescaleDB | Time-series telemetry, append-heavy, range queries | ✅ running (Postgres 18 base) |
| MongoDB | GeoJSON fences, variable-shape alert docs, device configs | ✅ running (Mongo 8) |
| Redis | Live positions (GEO), idempotency keys, pub/sub | ⬜ commented out in `docker-compose.yml`, not yet wired |

**Why not one database:** forcing time-series, geospatial documents, and sub-millisecond hot state into a single relational schema means JSONB columns and workarounds everywhere — "MongoDB with extra steps," as the README puts it. Three purpose-built stores, used deliberately, beats one store used for everything it's bad at.

**Pros**
- Each workload gets primitives built for it (hypertables + compression for telemetry; native geospatial + flexible schema for Mongo; `GEOADD`/`GEOSEARCH` + TTLs for Redis).
- Service ownership boundaries are enforced by the storage boundary, not just convention — a service literally cannot see another service's tables.

**Cons**
- Three database engines to run, monitor, and back up in production (acceptable trade-off for a portfolio project's demonstrated skill; would need justification at a real company with ops headcount).
- No cross-store transactions — consistency between, say, Mongo and Redis has to be handled explicitly (see Outbox pattern below).

**Detail:** [`.cursor/rules/database-design.mdc`](../.cursor/rules/database-design.mdc)
</details>

<details>
<summary><b>Why TimescaleDB, not InfluxDB or vanilla Postgres</b></summary>

**Why:** Telemetry is time-ordered, append-heavy, queried by time range — Timescale's hypertables give automatic time-based partitioning and order-of-magnitude faster range queries than vanilla Postgres. Choosing Timescale over InfluxDB keeps relational integrity (foreign keys, transactions) for device records without running two separate database engines for one logical store.

**Pros:** single engine serves both relational device data and time-series telemetry; compression + retention policies are built in; standard SQL/`pg` tooling.

**Cons:** not as purpose-built for pure time-series as InfluxDB at extreme scale; hypertable tuning (chunk intervals, compression policy) is another thing to get right.
</details>

<details>
<summary><b>Why MongoDB for fences, alerts, and configs</b></summary>

**Why:** Fences are GeoJSON polygons of varying complexity; alerts have payloads that vary by type (breach vs battery vs disconnection); device configs are user-defined blobs. All three are naturally document-shaped, variable-shape data — modeling them relationally means JSONB columns standing in for what Mongo already does natively, plus native geospatial query support.

**Pros:** schema flexibility matches genuinely variable data; native geospatial operators for polygon storage/queries.

**Cons:** no cross-collection joins or foreign keys — application code (or events) must maintain referential consistency; a second query language/mental model alongside SQL.
</details>

<details>
<summary><b>Why Redis for hot state, not just a cache</b></summary>

**Why:** three distinct jobs, one technology, each idiomatic: (1) `GEOADD`/`GEOSEARCH` for "which devices are inside polygon X right now" — orders of magnitude faster than the equivalent relational query at this scale; (2) idempotency keys with TTL, a one-line `SET key 1 NX EX 86400` check; (3) pub/sub fan-out so `realtime-gateway` stays loosely coupled from `alerting-service`.

**Rule:** Redis is a cache + ephemeral coordinator, never a system of record — no business state is persisted there long-term.

**Pros:** sub-millisecond reads for the hottest path in the system (geofence checks); TTL and pub/sub primitives map directly onto the idempotency and fan-out problems without extra infrastructure.

**Cons:** in-memory — data loss on crash is expected and must be tolerable for everything stored there (it is, by design: it's cache/coordination, not source of truth); currently not yet running, so `geofence-engine`/`realtime-gateway`/idempotency can't be built until it's enabled.
</details>

---

## Messaging & streaming

<details open>
<summary><b>Kafka as the stream backbone, not direct service-to-service HTTP calls</b></summary>

**Why:** multiple services independently consume the same `telemetry.raw` stream (`ingestion-service` writes it to TimescaleDB, `geofence-engine` runs breach detection, a future analytics consumer could read it too). Adding a new consumer requires zero upstream changes. Replay capability lets a downstream bug be fixed without losing data — impossible with direct HTTP calls, which would also couple every producer to every consumer.

**Pros:** consumers scale/fail independently; replay for bug recovery; natural fit for the "3M events/day, many independent readers" shape of this problem.

**Cons:** operational complexity (a broker to run, monitor, and reason about) that direct calls wouldn't have; eventual rather than immediate consistency between producer and consumer.

**Design decisions (not yet built — Kafka is commented out in `docker-compose.yml`):**
- **Mode:** KRaft (no Zookeeper) — one less moving part to run.
- **Client:** `kafkajs`, one singleton producer/consumer per process.
- **Partition key = `device_id`** on both `telemetry.raw` and `alerts.breaches` — same device always lands on the same partition, so per-device ordering is guaranteed and tracing stays co-located. Rejected alternative: partitioning by farm ID, which would create hot partitions on large farms.
- **Producer config:** `acks: 'all'`, `idempotent: true`, Snappy compression for telemetry (3–5x bandwidth savings).
- **Schema evolution:** Confluent Schema Registry + Avro, so producers/consumers evolve independently without breaking each other.

**Detail:** [`.cursor/rules/kafka.mdc`](../.cursor/rules/kafka.mdc)
</details>

<details>
<summary><b>MQTT for device ingestion, not HTTP</b></summary>

**Why:** MQTT is what real IoT devices use — low bandwidth, persistent connection, QoS delivery guarantees, last-will messages for disconnection detection. A telemetry platform that ingests over HTTP hasn't met the constraints real hardware operates under. Mosquitto in a container is a few lines of Compose; the simulator publishes exactly the way real collars would.

**Pros:** matches real-world device behavior (portfolio-credibility and technically correct); QoS and last-will give disconnection detection for free.

**Cons:** another protocol/broker to run and understand versus "just use HTTP everywhere"; not yet enabled (commented out in `docker-compose.yml`, `device-simulator`/`mqtt-bridge` not built).
</details>

---

## Auth

<details open>
<summary><b>JWT via a shared <code>@herdlink/auth</code> library, shared dev secret, user vs. service tokens</b></summary>

**Decision:** A shared NestJS library (`libs/auth`) wraps `@nestjs/jwt`. Two token types: `user` (1h TTL, roles claim) and `service` (365d TTL, for machine-to-machine calls), both issued under issuer `herdlink`. In local dev, every service that verifies or issues JWTs shares the same secret (`JWT_SECRET` env var).

**Why:** per the PRD's non-goals, this is "simple JWT, not a SaaS" — no multi-tenancy, no SSO. A shared library means every service validates tokens identically instead of nine subtly different JWT configs. Splitting user vs. service tokens keeps human-initiated actions and service-to-service calls distinguishable in logs and authorization checks without building a full OAuth client-credentials flow.

**Pros**
- One implementation to test and secure, reused everywhere via DI (`AUTH_OPTIONS` token, `AuthModule`).
- Clear separation between "a human did this" and "a service did this" without extra infrastructure.

**Cons**
- Shared secret across services is a single point of compromise — acceptable for local dev / portfolio scope, would need per-service keys or an OAuth2/OIDC provider in a real multi-team production system.
- No refresh-token flow, no revocation list — a leaked user token is valid for its full 1h TTL.

**Feature spec:** [`libs/auth/README.md`](../libs/auth/README.md)

**Note:** the shared-secret rationale is referenced in `docker-compose.yml` as living in an ADR; no such ADR exists yet in `docs/adr/` — worth writing if this decision is ever questioned in review.
</details>

---

## Persistence & validation patterns

<details open>
<summary><b>TypeORM (Postgres/Timescale) + Mongoose (MongoDB), <code>pg</code> driver underneath</b></summary>

**Why:** both are the standard, actively-maintained ORM/ODM for their respective NestJS integrations (`@nestjs/typeorm`, `@nestjs/mongoose`), with first-class dependency-injection support so repositories can be mocked in unit tests.

**Pros:** migrations, entity typing, and query builders come for free; NestJS module integration keeps connection lifecycle (init/shutdown) consistent with the rest of the app.

**Cons:** ORMs add an abstraction layer over raw SQL that can hide expensive queries; TypeORM's decorator-based entities add some boilerplate versus a query-builder-only approach.

**Detail:** [`.cursor/rules/sql.mdc`](../.cursor/rules/sql.mdc)
</details>

<details>
<summary><b>class-validator + class-transformer, global <code>ValidationPipe</code></b></summary>

**Why:** DTOs declare their own validation rules as decorators, co-located with the shape they validate. A single global pipe (`whitelist: true, forbidNonWhitelisted: true, transform: true`) means every controller gets input sanitization and type coercion without repeating config per-route — and unexpected fields are rejected outright rather than silently ignored.

**Pros:** validation logic lives with the DTO, not scattered across controllers; consistent 400 responses with field-level detail across every service.

**Cons:** decorator-heavy DTOs; complex cross-field validation still needs custom validators.
</details>

<details>
<summary><b>Identifiers: UUIDs everywhere (v7 preferred)</b></summary>

**Why:** one canonical ID per entity, never an internal sequence ID exposed externally. UUIDv7 is time-ordered, so it indexes better than v4 while keeping generation decentralized (any service can mint an ID without a round-trip).

**Pros:** no coordination needed to generate unique IDs across services; v7's time-ordering keeps B-tree indexes from fragmenting the way random v4 IDs do.

**Cons:** UUIDs are larger than integer PKs (storage/index size cost); v7 requires libraries that support the newer spec.
</details>

---

## Observability

<details open>
<summary><b>Three pillars wired before business code: Pino logs, OpenTelemetry traces, Prometheus metrics</b></summary>

**Why:** per the PRD, observability is "a pre-requisite, not a phase" — a system that computes fence breaches in under 2 seconds needs to be debuggable when that target is missed, and that instrumentation is far more expensive to retrofit than to build in from the start.

| Pillar | Choice | Status |
|---|---|---|
| Logs | Pino, structured JSON, redaction of secrets, `correlationId`/`traceId` on every line | ✅ (`@herdlink/observability`) |
| Traces | OpenTelemetry Node SDK → OTLP HTTP → Jaeger | 🚧 (lib built, `infra/jaeger/` present, not all services wired) |
| Metrics | Prometheus (RED metrics + domain metrics) + Grafana dashboards | ⬜ (`infra/prometheus/`, `infra/grafana/` present, not wired) |

**Shared library (`@herdlink/observability`):** correlation-ID middleware, a tracing interceptor, AsyncLocalStorage-based request context (so logs pick up correlation IDs without manual plumbing), and an injectable `LOGGER` token — all NestJS-integrated so every service wires this identically.

**Pros**
- Every service is debuggable the same way from day one — no "which services have logging" uncertainty.
- Correlation IDs propagate from MQTT publish through to WebSocket push once every hop is wired, giving one trace ID across all 9 services for the alert path.
- Shared library means fixing an observability bug fixes it everywhere at once.

**Cons**
- Upfront cost before any business logic ships — slower to get a first demo running.
- AsyncLocalStorage has a small but real perf overhead on every request.

**Detail:** [`.cursor/rules/reliability-scalability.mdc`](../.cursor/rules/reliability-scalability.mdc), [`libs/observability/README.md`](../libs/observability/README.md)
</details>

---

## Distributed-systems patterns (designed, mostly not yet built)

These are documented now because they shape the services that will implement them (`ingestion-service`, `geofence-engine`, `alerting-service` — all ⬜ not started). Recording the decision before the code exists means the design is settled, not improvised mid-implementation.

<details open>
<summary><b>Idempotency on every Kafka consumer</b></summary>

**Why:** Kafka guarantees at-least-once delivery. Without an idempotency check, a redelivered message means duplicate telemetry rows or duplicate alerts. Redis-backed keys with a 24h TTL turn "at-least-once" into "effectively-once" with one atomic check (`SET key 1 NX EX 86400`) before any side effect runs.

**Pros:** cheap (one Redis round-trip), correct under redelivery, and the same pattern applies to every consumer regardless of payload.

**Cons:** depends on Redis being up — if Redis is down, the choice is "block consumption" or "risk duplicates," and that failure mode needs to be explicit.
</details>

<details open>
<summary><b>Outbox pattern in <code>alerting-service</code></b></summary>

**Why:** an atomic "write alert to MongoDB AND publish to Redis" isn't possible without a coordinator — the two systems don't share a transaction. Instead: write the alert document and an outbox record in the same Mongo transaction, then a separate worker drains the outbox to Redis and marks entries sent. The worker itself is idempotent and retries failed publishes with backoff.

**Pros:** no lost alerts if the publish step fails after the write succeeds (or vice versa) — the outbox is the single source of truth for "what still needs publishing."

**Cons:** publish is no longer instantaneous (drain-worker latency); another moving part (the outbox table/worker) to build, run, and monitor (pending count is itself a required metric).
</details>

<details open>
<summary><b>Choreography over orchestration; no two-phase commit, ever</b></summary>

**Why:** events driving the next step (choreography) keeps services decoupled — no central coordinator that becomes a single point of failure or a bottleneck. 2PC is explicitly ruled out: if a workflow seems to need it, that's a signal the service/transaction boundaries are drawn wrong, not a case for a distributed-transaction protocol.

**Pros:** services fail independently without a coordinator to also fail; matches the already-chosen event-driven (Kafka) backbone.

**Cons:** harder to see "the whole workflow" in one place — debugging a multi-step flow means following events across services (mitigated by distributed tracing); orchestration is deliberately kept as a fallback only when ordering is critical enough to justify a central state machine.

**Detail:** [`.cursor/rules/distributed-systems.mdc`](../.cursor/rules/distributed-systems.mdc)
</details>

---

## Infra & repo structure

<details open>
<summary><b>Single Docker Compose file, services enabled progressively as they're built</b></summary>

**Why:** `docker compose up` bringing the whole system online in one command is a PRD success criterion. Rather than build the full 9-service Compose file speculatively, services are commented in as they're actually implemented — what's runnable in Compose always matches what's actually built, so the file never lies about system state.

**Pros:** no drift between "what Compose claims exists" and "what actually works"; new contributors can `docker compose up` and get a truthful picture of current state.

**Cons:** the commented-out blocks are dead weight in the file until uncommented — a reader has to know to look past them to see the target end-state (mitigated by the header comment listing every planned port).
</details>

<details>
<summary><b>Monorepo: <code>apps/</code> for services, <code>libs/</code> for shared code</b></summary>

**Why:** 9 services share cross-cutting concerns (auth, observability, eventually Kafka client utilities and contracts) — a monorepo with internal `file:` dependencies (`@herdlink/auth`, `@herdlink/observability`) lets those be versioned and evolved together without publishing to a registry.

**Pros:** one PR can change a shared lib and its consumers atomically; no version-skew between a lib and the services using it during active development.

**Cons:** `file:` dependencies need a build step per lib before a dependent service picks up changes; no independent versioning/release cadence per package (acceptable — there's one team, one deploy target).

**Note:** `libs/auth` exists and is built, but isn't listed in the PRD's original `libs/` plan (`kafka-client`, `observability`, `contracts`) — worth reconciling PRD.md §4 next time it's touched.
</details>

<details>
<summary><b>Testing: Jest (backend), co-located <code>*.spec.ts</code>, testcontainers planned for integration</b></summary>

**Why:** co-locating `foo.service.ts` with `foo.service.spec.ts` keeps tests next to the code they exercise — no parallel `__tests__` tree to keep in sync. Jest is NestJS's default and integrates with `@nestjs/testing`'s module-builder for DI-aware unit tests. Testcontainers (planned) means integration tests run against real Kafka/Redis/Postgres rather than mocks — "no mocks where a real container costs nothing."

**Pros:** tests can't drift far from the code they cover; testcontainers-based integration tests catch real driver/query bugs that mocks would hide.

**Cons:** testcontainers-based tests are slower and need Docker in CI; not yet built (no consumers/integration surfaces exist yet to test this way).
</details>

---

## Keeping this current

Update this file in the same change as any decision it documents — new datastore, new library, new pattern, or a reversal of something listed here. If a choice has real trade-offs and might be questioned in review, it belongs here *and* probably deserves its own ADR in [`docs/adr/`](./adr/) for the full context. This file stays a summary; the ADR is the detailed record.
