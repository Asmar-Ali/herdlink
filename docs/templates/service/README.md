# <service-name>

> Service docs index. Replace `<service-name>` and fill every `<…>` placeholder.
> These specs are **living docs** — update them in the same change as the code (see [keeping-specs-current](../../../.claude/skills/keeping-specs-current/SKILL.md)).

**Responsibility:** <one sentence — what this service does and nothing else>
**Milestone:** <M1 | M2 | M3 | M4> (see [PRD §8](../../../docs/PRD.md#8-milestones))
**Tier:** <Edge | Bridge | Processing | Consumer>
**Primary stores:** <TimescaleDB | MongoDB | Redis | PostgreSQL | none>

## SLO

- **SLI** (what's measured): <e.g., "successful telemetry writes">
- **SLO** (target): <e.g., "99.9% succeed within 100ms">
- **Error budget:** <derived from SLO>
- **Alert thresholds:** <multi-window burn rate, not raw thresholds>

## Failure mode

- **If it crashes:** <what happens>
- **If its dependencies fail:** <degradation behaviour>
- **Downstream affected:** <which services/flows>

## Specs

- [ENDPOINTS.md](./ENDPOINTS.md) — API surface (REST / GraphQL / WebSocket)
- [NETWORK.md](./NETWORK.md) — I/O contract (Kafka, datastores, sync calls, ports)
- [CHANGELOG.md](./CHANGELOG.md) — change history
- [TODO.md](./TODO.md) — built vs remaining
