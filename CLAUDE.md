# HerdLink

Real-time IoT telemetry & geofencing platform for connected livestock fleets — a 9-service, event-driven monorepo built to production-grade standards. **Only `device-service` is built so far.**

- **What & why:** [docs/PRD.md](./docs/PRD.md) (canonical) · [HerdLink_Project_Plan.pdf](./HerdLink_Project_Plan.pdf) (original blueprint) · [README.md](./README.md) (public pitch)
- **What's built vs remaining:** [docs/ROADMAP.md](./docs/ROADMAP.md) · per-service `apps/<service>/docs/TODO.md`
- **How we work:** [docs/DEVELOPMENT_LIFECYCLE.md](./docs/DEVELOPMENT_LIFECYCLE.md)

## Repo map

```
apps/            # the 9 services (mostly NestJS; dashboard-ui is React+Vite). Built: device-service. In progress: dashboard-ui (scaffolded). Rest: not started.
libs/            # shared: kafka-client, observability, contracts (not started)
docs/            # PRD, ROADMAP, lifecycle, ADRs, per-service-spec templates
.cursor/rules/   # engineering standards — THE SINGLE SOURCE OF TRUTH (see below)
.claude/         # skills (design decisions) + commands (lifecycle workflows)
infra/           # mosquitto, kafka, jaeger, prometheus, grafana
docker-compose.yml
```

## Engineering standards — single source of truth

The `.cursor/rules/*.mdc` files are the **authoritative, detailed standards**. Skills and this file *point* to them; they never copy the content. **Read the relevant `.mdc` before designing or writing code in that area.**

| When you're working on… | Read |
|---|---|
| NestJS structure, DI, modules, validation, testing | [`.cursor/rules/nestjs.mdc`](./.cursor/rules/nestjs.mdc) |
| Node runtime, async, errors, logging, shutdown | [`.cursor/rules/nodejs.mdc`](./.cursor/rules/nodejs.mdc) |
| Postgres / TimescaleDB queries, migrations, repos | [`.cursor/rules/sql.mdc`](./.cursor/rules/sql.mdc) |
| Polyglot persistence, data modeling, ownership | [`.cursor/rules/database-design.mdc`](./.cursor/rules/database-design.mdc) |
| Kafka producers/consumers, topics, schemas, DLQ | [`.cursor/rules/kafka.mdc`](./.cursor/rules/kafka.mdc) |
| Idempotency, outbox, sagas, tracing, consistency | [`.cursor/rules/distributed-systems.mdc`](./.cursor/rules/distributed-systems.mdc) |
| Observability, SLOs, backpressure, degradation, load | [`.cursor/rules/reliability-scalability.mdc`](./.cursor/rules/reliability-scalability.mdc) |

To change a standard, edit the `.mdc` — do not duplicate rules elsewhere.

## Established conventions (copy from `device-service`)

`device-service` is the **reference implementation**. New NestJS services mirror its structure and these conventions:

- **ESM with explicit `.js` import specifiers** (e.g., `import { X } from './x.js'`) — required for Node-executed (NestJS) services; `dashboard-ui` is Vite-bundled and uses Vite's own bundler resolution instead (see [ADR-0001](./docs/adr/0001-dashboard-ui-vite-module-resolution.md)).
- **API shape:** global prefix `api` + URI versioning → all routes are `/api/v1/...` (`bootstrap.ts`). Controllers use `@Controller({ path, version: '1' })`.
- **Response envelope:** every successful REST response is wrapped `{ data, meta: { timestamp, correlationId } }` by `ResponseInterceptor`. List endpoints put a `PaginatedResult` (`{ items, pagination }`) inside `data` via `buildPaginatedResult`.
- **Pagination:** `PaginationQueryDto` + `buildPaginatedResult` in `src/common/pagination/`.
- **Cross-cutting:** correlation-id middleware, tracing interceptor, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), global `HttpExceptionFilter`. Layering: controller (thin) → service (logic) → repository (persistence).
- **Persistence:** TypeORM (Postgres) + Mongoose (Mongo), config in `src/database/`. Co-locate tests as `foo.spec.ts`.

## Documentation discipline (non-negotiable)

- Per-service specs live in **`apps/<service>/docs/`**: `ENDPOINTS.md`, `NETWORK.md`, `CHANGELOG.md`, `TODO.md`, `README.md`.
- **Update specs in the same change as the code** — never ship code and docs separately. Use `/sync-specs`.
- Capture non-obvious decisions as ADRs in `docs/adr/` (`/new-adr`). Standards changes go in the `.mdc`, not in an ADR.

## Skills & commands

- **Skills (auto-invoked):** `designing-a-service`, `choosing-data-storage`, `designing-event-flows`, `keeping-specs-current`.
- **Commands (you run):** `/new-service <name>`, `/sync-specs [service]`, `/new-adr <title>`, `/status`.

## Working agreement

- Plan against a PRD milestone; TDD (failing test first); follow the `.mdc` for the layer you're in.
- Don't introduce a new datastore, Kafka topic, or sync service-to-service call without checking the relevant standard and writing an ADR if it's a real choice.
- Keep `ROADMAP.md` and the touched service's `TODO.md` current as state changes.
