# device-simulator

> Service docs index. These specs are **living docs** — update them in the same change as the code (see [keeping-specs-current](../../../.claude/skills/keeping-specs-current/SKILL.md)).

**Responsibility:** Simulates one GPS collar — a bounded random-walk position and gradually draining battery — and publishes telemetry over MQTT every 30s.
**Milestone:** M1 (see [PRD §8](../../../docs/PRD.md#8-milestones))
**Tier:** Edge
**Primary stores:** none

## SLO

- **SLI** (what's measured): successful MQTT publishes per tick
- **SLO** (target): 99% of ticks publish successfully over a rolling 10-minute window (accounts for baseline `mqtt.js` reconnect churn)
- **Error budget:** 1% of ticks may fail to publish (logged, not retried individually — the next tick supersedes it)
- **Alert thresholds:** none yet — this is a portfolio demo source, not on an alerting path (M4 observability work, if added, would use multi-window burn rate per the standard)

## Failure mode

- **If it crashes:** the demo device stops moving/reporting; nothing downstream is fed telemetry. `restart: unless-stopped` in Docker Compose brings it back.
- **If its dependencies fail:** Mosquitto being unreachable doesn't crash the process — `mqtt.js`'s built-in auto-reconnect retries indefinitely in the background; the `/health` endpoint reports unhealthy while disconnected.
- **Downstream affected:** every service in the pipeline (`mqtt-bridge`, `ingestion-service`, `geofence-engine`, `realtime-gateway`, `dashboard-ui`) — this is the sole telemetry source until real hardware or additional simulated devices exist.

## Specs

- [ENDPOINTS.md](./ENDPOINTS.md) — API surface (REST / GraphQL / WebSocket)
- [NETWORK.md](./NETWORK.md) — I/O contract (Kafka, datastores, sync calls, ports)
- [CHANGELOG.md](./CHANGELOG.md) — change history
- [TODO.md](./TODO.md) — built vs remaining
