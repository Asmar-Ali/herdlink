# device-simulator — TODO

> Built vs remaining for this service, tracked against [PRD milestones](../../../docs/PRD.md#8-milestones).
> When the balance shifts, also update the service's row in [ROADMAP.md](../../../docs/ROADMAP.md). `/status` reads this file.

**Overall status:** ✅ Built (M1 core complete)
**Current milestone:** M1

## Built ✅

- [x] `TelemetryMessage` envelope (`deviceId`, `herdId`, `timestamp`, `position`, `batteryLevel`, `sequence`, `correlationId`)
- [x] `nextPosition` — bounded random-walk GPS step, RNG injected for testability
- [x] `nextBatteryLevel` — gradual jittered drain, floors at a configurable minimum
- [x] `MqttPublisher` — connects, logs connect/reconnect/close/error, publishes to `herdlink/telemetry/<deviceId>` at QoS 1, retain false
- [x] `Simulator` — recursive `setTimeout` tick loop (30s default), publishes one message per tick, keeps ticking through publish failures
- [x] `/health` endpoint reflecting MQTT connection state
- [x] Graceful shutdown on `SIGTERM`/`SIGINT` — stops the loop, closes the MQTT client, shuts down tracing
- [x] Unit tests: `gps-walk.spec.ts`, `battery.spec.ts`, `mqtt-publisher.spec.ts`, `simulator.spec.ts`
- [x] Docker Compose wiring — Mosquitto uncommented, `device-simulator` service added

## Remaining ⬜

### M2 — Scale, geofences, domain
- [ ] Simulate multiple devices (1,000 collars), not just one — currently hardcoded to a single reused seed device (`SIM-000001`)
- [ ] Offline/reconnect simulation (buffering while "offline", replaying on reconnect) — deferred from M1 since no downstream reconciliation consumer exists yet
- [ ] Promote `TelemetryMessage` to `libs/contracts` once `mqtt-bridge` needs to share the shape

## Known gaps / tech debt

- Single hardcoded device identity (`SIM-000001` / `herd-demo-1`) — fine for the M1 walking skeleton, not representative of the eventual 1,000-device fleet.
- No last-will message wired (documented in [NETWORK.md](./NETWORK.md), deferred alongside offline simulation).
- No integration test against a real Mosquitto broker yet — only unit tests with a fake MQTT client. Manual verification via `mosquitto_sub` is the current substitute (see [BUILD_PLAN.md](../BUILD_PLAN.md) verification steps).
