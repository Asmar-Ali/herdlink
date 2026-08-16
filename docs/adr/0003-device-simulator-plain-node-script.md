# ADR-0003: device-simulator is a plain Node/TS script, not NestJS

- **Status:** Accepted
- **Date:** 2026-08-17
- **Deciders:** HerdLink engineering

## Context

Every other HerdLink service built so far (`device-service`) is a NestJS app,
and the platform's established conventions (`nestjs.mdc`, `docs/templates/service/`)
assume an HTTP-serving, DI-driven service. `device-simulator` is different: it's
a publish-only worker that connects to MQTT and ticks on a timer. It has no
controllers, no resolvers, no domain persistence, and — beyond a single
liveness route — no meaningful HTTP surface at all.

## Decision

Build `device-simulator` as a plain Node.js/TypeScript script (ESM), not a
NestJS application:

- No `@nestjs/*` dependencies, no decorators, no DI container.
- `nodejs.mdc`'s full strict TypeScript config applies cleanly (`strict: true`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) since there's no
  decorator-metadata constraint forcing looser settings, unlike `device-service`.
- Dependencies are constructed and wired by hand in `main.ts` (`MqttPublisher`,
  `Simulator`), with dependency injection done via plain constructor options
  rather than a DI container — enough to keep the code testable without
  pulling in framework machinery for a single-purpose worker.
- The one HTTP route it does need (`GET /health`) is served via Node's
  built-in `http` module rather than pulling in Nest/Express for one endpoint.

## Consequences

- **Positive:** No framework overhead for a service that's fundamentally a
  timer loop plus a publish call. Faster startup, smaller dependency tree.
- **Positive:** `nodejs.mdc`'s stricter TypeScript settings apply without a
  decorator-metadata carve-out.
- **Negative:** Diverges from `device-service`'s NestJS structure and the
  `docs/templates/service/` assumptions (e.g. `ENDPOINTS.md`'s template is
  100%-HTTP-shaped) — future maintainers scaffolding a new service need to
  recognise "edge worker" as a legitimate second shape, not just copy
  `device-service` blindly.
- **Negative:** If this service later needs more structure (multiple simulated
  devices with independent lifecycles, config hot-reload, etc.), it may
  outgrow the hand-wired approach and need revisiting — tracked as an M2 item
  in [device-simulator's TODO.md](../../apps/device-simulator/docs/TODO.md).

## Alternatives considered

1. **NestJS with a single `@Injectable()` worker service and no controllers** —
   rejected; pulls in the entire Nest module/DI/bootstrap machinery for a
   process with no HTTP API and one dependency graph that's easier to wire by
   hand.
2. **A cron-style script invoked externally** — rejected; the tick loop needs
   in-process state (position, battery, sequence counter) and a persistent
   MQTT connection, which a re-invoked script would have to rebuild every run.
