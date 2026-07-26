# device-service — TODO

> Built vs remaining, tracked against [PRD milestones](../../../docs/PRD.md#8-milestones).
> Update the service row in [ROADMAP.md](../../../docs/ROADMAP.md) when status changes. `/status` reads this file.

**Overall status:** ✅ Built (M2 core complete)
**Current milestone:** M2

---

## Built ✅

- [x] `Device` entity — PostgreSQL via TypeORM; UUID PK; `serialNumber` unique; enums `DeviceType`, `DeviceStatus`; denormalised last position + battery; `metadata` JSONB
- [x] Devices CRUD — `POST /api/v1/device`, `GET` (paginated), `GET /:id`, `PATCH /:id`, `DELETE /:id`
- [x] `Geofence` schema — MongoDB via Mongoose; `geofences` collection; GeoJSON Polygon; 2dsphere index; `INCLUSION`/`EXCLUSION` type; `ENTER`/`EXIT`/`BOTH` breach direction; `herdIds`, `active`, `alertCooldownSeconds`, `severity`
- [x] Fences CRUD — `POST /api/v1/fence`, `GET` (paginated), `GET /:id`, `PATCH /:id`, `DELETE /:id`
- [x] Global platform wiring — URI versioning, response envelope, pagination, correlation-id, tracing interceptor, validation pipe, exception filter, shutdown hooks, env validation
- [x] `ParseObjectIdPipe` for MongoDB ObjectId path validation
- [x] Device seed service + fence seed data
- [x] Unit tests — controller, service, repository (devices + fences)
- [x] E2E tests — device flows + fence flows
- [x] JWT auth on write endpoints via shared `@herdlink/auth`; reads remain public
- [x] Demo login — `POST /api/v1/auth/login` (hardcoded rancher credentials; interim for `dashboard-ui`)

---

## Remaining ⬜

### M3 — Production patterns
- [ ] Replace demo login with a real identity flow (`realtime-gateway` / dedicated auth) — public surface of `/api/v1/auth/login` may move
- [ ] `PATCH /api/v1/device/:id` called by `ingestion-service` to update `lastLatitude`, `lastLongitude`, `lastSeenAt`, `batteryLevel` — define the internal contract first (sync call vs event)

### M4 — Observability & polish
- [ ] Prometheus RED metrics per route (request rate, error rate, latency histogram)
- [ ] `/health` (liveness) and `/ready` (readiness, flips false on SIGTERM) endpoints
- [ ] Integration tests with testcontainers (real Postgres + Mongo in CI) — currently E2E only
- [ ] `LOAD_TEST_RESULTS.md` entry for CRUD endpoints under load

---

## Known gaps / tech debt

- Login is a single shared demo account (`rancher@herdlink.io` / `herdlink-demo`) — no signup, password hashing, or per-operator accounts ([ADR-0002](../../../docs/adr/0002-auth-login-in-device-service.md)).
- `UpdateDeviceDto` imports `CreateDeviceDto` without `.js` extension (`import { CreateDeviceDto } from './create-device.dto'`) — inconsistent with ESM convention; harmless in current build but should be corrected.
- TypeORM `synchronize: true` in non-production — acceptable for portfolio, must be replaced with explicit migrations before any real deployment.
- No health/readiness endpoints yet — omitted for M2, required by M4 and the `reliability-scalability.mdc` standard.
