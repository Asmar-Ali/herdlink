# device-service — Changelog

> Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
> Update under `[Unreleased]` in the same change as the code. `/sync-specs` does this.

## [Unreleased]

### Added

- Shared `@herdlink/auth` integration with global JWT verification, user/service
  token issuance, and `JWT_SECRET` startup validation.
- **Demo login** — `POST /api/v1/auth/login` (`AuthModule`) issues a bearer JWT +
  session user for the hardcoded operator (`rancher@herdlink.io` /
  `herdlink-demo`). Public endpoint; interim until a dedicated identity flow
  lands ([ADR-0002](../../../docs/adr/0002-auth-login-in-device-service.md)).
  Unit + E2E coverage (`auth.controller.spec.ts`, `auth.service.spec.ts`,
  `test/auth.e2e-spec.ts`).
- Authentication E2E coverage for missing, malformed, and valid bearer tokens.

### Changed

- **BREAKING:** Device and fence `POST`, `PATCH`, and `DELETE` routes now require
  a valid bearer JWT. `GET` routes remain public.
- Docker image build context is the monorepo root so `@herdlink/auth` /
  `@herdlink/observability` (`file:../../libs/*`) install correctly; compose
  mounts `./libs` alongside the service for live reload.

---

## [0.1.0] — 2026-05-25

### Added

- **Devices CRUD** — `POST /api/v1/device`, `GET /api/v1/device`, `GET /api/v1/device/:id`, `PATCH /api/v1/device/:id`, `DELETE /api/v1/device/:id`
  - `Device` entity backed by PostgreSQL (TypeORM); UUID primary key; `serialNumber` unique index; indexes on `status`, `herdId`
  - `DeviceType` enum: `COLLAR_V1`, `COLLAR_V2`
  - `DeviceStatus` enum: `ACTIVE`, `INACTIVE`, `DECOMMISSIONED`, `LOST`
  - Denormalised `lastLatitude`, `lastLongitude`, `lastSeenAt`, `batteryLevel` for fast list queries
  - `metadata` JSONB column for free-form config
  - Seed service with sample devices

- **Fences CRUD** — `POST /api/v1/fence`, `GET /api/v1/fence`, `GET /api/v1/fence/:id`, `PATCH /api/v1/fence/:id`, `DELETE /api/v1/fence/:id`
  - `Geofence` schema backed by MongoDB (Mongoose); `geofences` collection
  - GeoJSON Polygon geometry with 2dsphere index; ring-closure validation in service layer
  - `GeofenceType` enum: `INCLUSION`, `EXCLUSION`
  - `BreachDirection` enum: `ENTER`, `EXIT`, `BOTH`
  - `alertCooldownSeconds`, `severity`, `herdIds`, `active` flag
  - `ParseObjectIdPipe` for MongoDB ObjectId path validation
  - Seed service with sample fences

- **Platform cross-cutting** (applied globally)
  - URI versioning (`/api/v1/...`) + global prefix `api`
  - `{ data, meta: { timestamp, correlationId } }` response envelope (`ResponseInterceptor`)
  - `PaginationQueryDto` + `buildPaginatedResult` for all list endpoints (page/limit, default 20, max 100)
  - `CorrelationIdMiddleware` — generates/propagates `X-Correlation-ID`
  - `TracingInterceptor` — OpenTelemetry span per HTTP request
  - Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
  - Global `HttpExceptionFilter` — consistent error shape
  - `enableShutdownHooks()` for graceful SIGTERM handling
  - Typed env validation at startup (`validateEnv`)
  - Unit tests (controller, service, repository) and E2E tests (device + fence flows)
