# HerdLink — Development Lifecycle & Agentic Setup

> How we build HerdLink consistently across 9 services, and how the Claude Code setup keeps that consistency at scale. Read this once; it explains where everything lives and why.

---

## 1. The artifacts and how they relate

There is **one home for every kind of knowledge**, so nothing drifts:

| Knowledge | Single home | Who reads it |
|---|---|---|
| *What* we're building & *why* | [`docs/PRD.md`](./PRD.md) | Everyone, before planning work |
| *What's built vs remaining* (platform) | [`docs/ROADMAP.md`](./ROADMAP.md) | Anyone asking "where are we" |
| *Engineering standards* (the rules) | [`.cursor/rules/*.mdc`](../.cursor/rules/) | Anyone designing/writing code |
| *Why a specific decision was made* | [`docs/adr/`](./adr/) | Anyone revisiting a choice |
| *A service's API surface* | `apps/<service>/docs/ENDPOINTS.md` | API consumers, integrators |
| *A service's I/O contract* | `apps/<service>/docs/NETWORK.md` | Anyone wiring services together |
| *A service's change history* | `apps/<service>/docs/CHANGELOG.md` | Reviewers, future maintainers |
| *A service's built vs remaining* | `apps/<service>/docs/TODO.md` | Anyone working on that service |
| *Project map + conventions for Claude* | [`/CLAUDE.md`](../CLAUDE.md) | Claude, every session (always loaded) |

**Critical principle:** the `.cursor/rules/*.mdc` files are the **single source of truth for engineering standards**. `CLAUDE.md` and the skills *point* to them — they never copy their content. To change a standard, edit the `.mdc`; everything else picks it up.

## 2. The development loop

Every unit of work follows the same six steps:

1. **Plan.** Trace the work to a PRD goal/milestone. New service? run `/new-service`. Non-obvious technical choice? capture it with `/new-adr` *before* building.
2. **Design.** Let the relevant skill fire (or invoke it): `designing-a-service`, `choosing-data-storage`, `designing-event-flows`. Each routes you to the authoritative `.mdc`. Copy structure from `device-service` — it's the reference implementation.
3. **Build.** TDD: a failing test before business logic. Follow the `.mdc` standards for the layer you're in (NestJS, SQL, Kafka, Node). Match the established conventions (ESM `.js` specifiers, `/api/v1` prefix + URI versioning, `{ data, meta }` envelope, pagination helper, correlation-id/tracing).
4. **Document.** In the *same change* as the code, update the touched service's `ENDPOINTS.md` / `NETWORK.md` / `CHANGELOG.md` / `TODO.md`. `/sync-specs` does this; the `keeping-specs-current` skill enforces the discipline. Code and docs ship together — never separately.
5. **Verify.** Unit tests on logic; integration tests against real dependencies (testcontainers); e2e on critical flows; k6 load assertions where perf is a requirement (per `reliability-scalability.mdc`).
6. **Know the state.** Update `ROADMAP.md`. `/status` answers "what's built / what's left" across the platform at any moment.

## 3. Quality bar (cross-cutting, every milestone)

These run continuously, not as a separate phase — they're what makes the work senior-grade. Each significant one gets an ADR.

- Idempotent consumers · Outbox pattern · Schema evolution (Avro) · Backpressure · Graceful degradation · Distributed tracing · The test pyramid with real dependencies · Conventional commits + clean git history.

Details and rationale: [`reliability-scalability.mdc`](../.cursor/rules/reliability-scalability.mdc) and [`distributed-systems.mdc`](../.cursor/rules/distributed-systems.mdc).

## 4. Keeping the agentic setup improving (the meta-loop)

The setup is designed to get *more* consistent as the platform grows, not less:

1. **A pattern or correction emerges** while building (e.g., a new retry convention, a better module layout).
2. **Update the standard at its single source** — the relevant `.cursor/rules/*.mdc`. This is the only place the rule lives, so every service and every future Claude session inherits it immediately.
3. **Record the decision** as an ADR (`/new-adr`) when it's a genuine choice with trade-offs.
4. **Adjust the thin routers** — if a new domain of decisions appears, add a skill or command that *points* to the standard. Skills/commands stay thin so they rarely need editing.
5. **Promote reference implementations.** When a service does something better than `device-service`, note it in `CLAUDE.md` so the next service copies the better pattern.

Because the heavy content has exactly one home (`.mdc`) and everything else routes to it, improvements propagate without duplication and the setup can't silently drift.

## 5. Quick reference — Claude tooling

| Tool | Type | Use |
|---|---|---|
| `designing-a-service` | skill (auto) | Building/structuring a new NestJS service |
| `choosing-data-storage` | skill (auto) | Deciding Timescale vs Mongo vs Redis, ownership, IDs |
| `designing-event-flows` | skill (auto) | Kafka topics, idempotency, outbox, DLQ, tracing |
| `keeping-specs-current` | skill (auto) | Updating colocated specs when code changes |
| `/new-service <name>` | command | Scaffold a new service's docs + register it |
| `/sync-specs [service]` | command | Update specs to match code after a change |
| `/new-adr <title>` | command | Create the next numbered ADR |
| `/status` | command | Report built-vs-remaining across the platform |
