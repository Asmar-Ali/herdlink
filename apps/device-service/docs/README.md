# device-service

> Living docs — update in the same change as the code. See [keeping-specs-current](../../../.claude/skills/keeping-specs-current/SKILL.md).

**Responsibility:** REST CRUD management API for devices (GPS collars) and geofences. The authoritative source of device registry and fence definitions for the rest of the platform.
**Milestone:** M2
**Tier:** Consumer (REST API)
**Primary stores:** PostgreSQL (`devices` table) · MongoDB (`geofences` collection)

## SLO

- **SLI:** Successful HTTP responses (2xx) on all CRUD endpoints, measured per-route.
- **SLO:** 99.9% of requests succeed within 200ms (P95) under normal load. (Target — not yet instrumented; metrics planned M4.)
- **Error budget:** 0.1% error rate = ~8.6 min/day.
- **Alert thresholds:** Multi-window burn rate when instrumented (M4).

## Failure mode

- **If it crashes:** Devices and fences remain in their databases; no data is lost. The dashboard cannot query device/fence metadata; `geofence-engine` cannot refresh its fence cache until service recovers.
- **If Postgres fails:** Device CRUD returns 503; fence operations unaffected.
- **If MongoDB fails:** Fence CRUD returns 503; device operations unaffected.
- **Downstream affected:** `geofence-engine` (reads fences on startup via REST), `dashboard-api` (queries device metadata).

## Specs

- [ENDPOINTS.md](./ENDPOINTS.md) — full REST surface (`/api/v1/device`, `/api/v1/fence`)
- [NETWORK.md](./NETWORK.md) — datastores, ports, env vars, observability
- [CHANGELOG.md](./CHANGELOG.md) — change history
- [TODO.md](./TODO.md) — built vs remaining
