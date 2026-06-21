---
name: designing-a-service
description: Use when creating, structuring, or scaffolding a new HerdLink NestJS service (or significantly restructuring an existing one) — deciding modules, DI, layering, config, health/readiness, graceful shutdown, observability wiring, and the shared platform conventions. Triggers on "new service", "scaffold a service", "add a microservice", "set up <name>-service", "how should this service be structured".
---

# Designing a HerdLink service

Keep every service consistent with the platform. This skill is a decision checklist; the **authoritative detail lives in the `.cursor/rules/*.mdc` standards — read them before deciding.**

## Read first (single source of truth)
- [`.cursor/rules/nestjs.mdc`](../../../.cursor/rules/nestjs.mdc) — module structure, DI, validation, lifecycle hooks, testing.
- [`.cursor/rules/nodejs.mdc`](../../../.cursor/rules/nodejs.mdc) — async, typed errors, logging, graceful shutdown.
- [`.cursor/rules/reliability-scalability.mdc`](../../../.cursor/rules/reliability-scalability.mdc) — observability-first, health/readiness, backpressure, SLOs.

## Reference implementation
Mirror **`apps/device-service`** and the conventions in [CLAUDE.md](../../../CLAUDE.md#established-conventions-copy-from-device-service): ESM `.js` import specifiers, `/api/v1` prefix + URI versioning, `{ data, meta }` response envelope, pagination helpers, correlation-id middleware, tracing interceptor, global validation + exception filter, controller→service→repository layering.

## Checklist
1. **Scope** — one responsibility (see the service's row in [PRD §4](../../../docs/PRD.md#4-architecture-overview)). If it does two things, it's two services.
2. **Module layout** — feature modules; `AppModule` is composition only; typed config via `@nestjs/config` (never read `process.env` directly).
3. **Observability before business logic** — Pino logging, RED + domain metrics, OpenTelemetry tracing wired at startup (non-negotiable per the reliability standard).
4. **Health & readiness** — `/health` (liveness) and `/ready` (readiness flips false on `SIGTERM` to drain traffic).
5. **Graceful shutdown** — `enableShutdownHooks()`; drain consumers/commit offsets/close pools on `SIGTERM`.
6. **Persistence** — pick stores via the `choosing-data-storage` skill; a service owns its data, no cross-service DB reads.
7. **Events** — if it consumes/produces Kafka, follow the `designing-event-flows` skill.
8. **Tests** — TDD; unit on logic, integration on real deps (testcontainers), e2e on critical flows.
9. **Document** — create `apps/<name>/docs/` from `docs/templates/service/` (use `/new-service`), declare the SLO, register in [ROADMAP.md](../../../docs/ROADMAP.md).

## Refuse (anti-patterns)
Logic in controllers · `new Service()` instead of DI · `forwardRef` to paper over circular deps · `any` in DTOs · scattered `process.env` reads · "add observability later".
