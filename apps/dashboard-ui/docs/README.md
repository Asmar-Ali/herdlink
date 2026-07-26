# dashboard-ui

> Service docs index. These specs are **living docs** — update them in the same change as the code (see [keeping-specs-current](../../../.claude/skills/keeping-specs-current/SKILL.md)).

**Responsibility:** Live map of devices + alert feed for farm operators — deliberately thin, no business logic (React + MapLibre)
**Milestone:** M1 → M3 (minimal map at M1; alert feed + ops features land through M3, see [PRD §8](../../../docs/PRD.md#8-milestones))
**Tier:** Consumer
**Primary stores:** none (stateless SPA; all state comes from `dashboard-api` and `realtime-gateway`)

## SLO

- **SLI** (what's measured): time-to-interactive on load; WebSocket reconnect success rate
- **SLO** (target): <to be set once dashboard-api/realtime-gateway are built and instrumented>
- **Error budget:** <derived from SLO>
- **Alert thresholds:** <multi-window burn rate, not raw thresholds>

## Failure mode

- **If it crashes:** static assets fail to load; browser shows blank page / cached shell (no server-side process to crash — this is a client-rendered SPA)
- **If its dependencies fail:** `dashboard-api` down → map/alerts fail to load, show stale-data banner; `realtime-gateway` down → live position/alert updates stop, fall back to last-known state with a "disconnected" indicator
- **Downstream affected:** none — this is the leaf of the architecture (operator-facing UI)

## Specs

- [ENDPOINTS.md](./ENDPOINTS.md) — API surface (this service exposes none; consumes others')
- [NETWORK.md](./NETWORK.md) — I/O contract (outbound calls, ports)
- [CHANGELOG.md](./CHANGELOG.md) — change history
- [TODO.md](./TODO.md) — built vs remaining
