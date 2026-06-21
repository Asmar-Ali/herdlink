# device-service — Network & I/O Contract

> Every byte in and out of this service.
> Standards: [database-design.mdc](../../../.cursor/rules/database-design.mdc), [sql.mdc](../../../.cursor/rules/sql.mdc).

## Listening ports

| Port | Protocol | Purpose |
|---|---|---|
| `3000` (default; `PORT` env overrides) | HTTP | REST API (`/api/v1/...`) |

_No WebSocket, no MQTT. This is a pure REST service._

## Kafka

**None.** `device-service` does not consume or produce Kafka topics in its current (M2) implementation. It exposes REST endpoints that other services call synchronously; `geofence-engine` will load fences from this service via REST on startup.

Planned future event production (M3+): publish a `device.updated` event when a device's last position/status is updated by `ingestion-service` callbacks. Requires an ADR before implementing.

## Datastores

| Store | Access | What | Key details |
|---|---|---|---|
| **PostgreSQL** | read/write | `devices` table | Pool configured via `POSTGRES_HOST/PORT/USER/PASSWORD/DB`; `synchronize: true` in non-production (TypeORM); indexes on `serialNumber`, `status`, `herdId` |
| **MongoDB** | read/write | `geofences` collection | URI from `MONGODB_URI`; 5s server-selection timeout; 2dsphere index on `geometry`; compound index `{ active: 1, type: 1 }` |

### PostgreSQL — `devices` table

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | auto-generated |
| `serialNumber` | `VARCHAR(64)` | unique, indexed |
| `name` | `VARCHAR(120)` | |
| `type` | `ENUM` | `COLLAR_V1`, `COLLAR_V2` |
| `status` | `ENUM` | `ACTIVE`, `INACTIVE`, `DECOMMISSIONED`, `LOST` |
| `herdId` | `VARCHAR(128)` nullable | indexed |
| `lastLatitude` | `DOUBLE PRECISION` nullable | denormalised from ingestion-service for fast list queries |
| `lastLongitude` | `DOUBLE PRECISION` nullable | |
| `lastSeenAt` | `TIMESTAMPTZ` nullable | |
| `batteryLevel` | `SMALLINT` nullable | |
| `metadata` | `JSONB` | default `{}` |
| `createdAt` | `TIMESTAMPTZ` | auto |
| `updatedAt` | `TIMESTAMPTZ` | auto |

### MongoDB — `geofences` collection

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | |
| `name` | `String` | max 120 |
| `description` | `String` | optional, max 500 |
| `type` | `String` enum | `INCLUSION`, `EXCLUSION` |
| `breachDirection` | `String` enum | `ENTER`, `EXIT`, `BOTH` |
| `geometry` | `GeoJSON Polygon` | 2dsphere indexed |
| `active` | `Boolean` | indexed |
| `herdIds` | `[String]` | indexed |
| `alertCooldownSeconds` | `Number` | default 300 |
| `severity` | `String` enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `metadata` | `Object` | |
| `createdBy` | `String` | optional |
| `updatedBy` | `String` | optional |
| `createdAt` | `Date` | auto (Mongoose timestamps) |
| `updatedAt` | `Date` | auto |

## Synchronous calls (outbound)

None currently. `geofence-engine` will call this service; this service does not call others.

## Required environment variables

| Variable | Description |
|---|---|
| `POSTGRES_HOST` | Postgres hostname |
| `POSTGRES_PORT` | Postgres port (default `5432`) |
| `POSTGRES_USER` | Postgres user |
| `POSTGRES_PASSWORD` | Postgres password |
| `POSTGRES_DB` | Postgres database name |
| `MONGODB_URI` | Full MongoDB connection URI |
| `PORT` | HTTP listen port (default `3000`) |
| `NODE_ENV` | `development` \| `production` (controls TypeORM `synchronize` and SQL logging) |

## Observability emitted

- **Logs:** Pino JSON with `correlationId` (from `CorrelationIdMiddleware`) and trace context.
- **Traces:** `TracingInterceptor` wraps every HTTP request as an OpenTelemetry span.
- **Metrics:** Not yet instrumented (planned M4). RED metrics target: request rate, error rate, latency P50/P95/P99 per route.
