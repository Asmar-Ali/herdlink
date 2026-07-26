# device-service — Endpoints

> All routes: global prefix `api` + URI versioning → `/api/v1/...`.
> Every successful response is wrapped: `{ data: <payload>, meta: { timestamp, correlationId } }`.
> List endpoints return `PaginatedResult` inside `data`: `{ items: [...], pagination: { page, limit, total, totalPages } }`.
> Errors are shaped by the global `HttpExceptionFilter` (not the envelope).
> Auth: reads are public. All `POST`, `PATCH`, and `DELETE` routes require
> `Authorization: Bearer <JWT>` with issuer `herdlink`; missing or invalid
> tokens return `401`.

---

## Devices — `/api/v1/device`

### `POST /api/v1/device`
Register a new device (collar).

**Body:** `CreateDeviceDto`

| Field | Type | Required | Validation |
|---|---|---|---|
| `serialNumber` | `string` | yes | 1–64 chars; unique |
| `name` | `string` | yes | 1–120 chars |
| `type` | `DeviceType` | no | `COLLAR_V1` \| `COLLAR_V2`; default `COLLAR_V1` |
| `status` | `DeviceStatus` | no | `ACTIVE` \| `INACTIVE` \| `DECOMMISSIONED` \| `LOST`; default `INACTIVE` |
| `herdId` | `string \| null` | no | max 128 chars |
| `lastLatitude` | `number \| null` | no | −90 to 90 |
| `lastLongitude` | `number \| null` | no | −180 to 180 |
| `lastSeenAt` | `Date \| null` | no | ISO 8601, coerced to `Date` |
| `batteryLevel` | `integer \| null` | no | 0–100 |
| `metadata` | `object` | no | free-form JSON |

**Success:** `201` → `data: Device`
**Errors:** `400` validation · `401` missing/invalid JWT · `409` `serialNumber` conflict

---

### `GET /api/v1/device`
List all devices, paginated.

**Query:** `page` (int ≥ 1, default `1`) · `limit` (int 1–100, default `20`)

**Success:** `200` → `data: PaginatedResult<Device>`

---

### `GET /api/v1/device/:id`
Get one device by UUID.

**Path:** `id` — UUID (validated by `ParseUUIDPipe`)

**Success:** `200` → `data: Device`
**Errors:** `400` invalid UUID · `404` not found

---

### `PATCH /api/v1/device/:id`
Partial update.

**Path:** `id` — UUID
**Body:** `UpdateDeviceDto` — all `CreateDeviceDto` fields, all optional (`PartialType`)

**Success:** `200` → `data: Device`
**Errors:** `400` validation · `401` missing/invalid JWT · `404` not found · `409` `serialNumber` conflict

---

### `DELETE /api/v1/device/:id`
Hard-delete a device.

**Path:** `id` — UUID

**Success:** `200` → `data: null`
**Errors:** `400` invalid UUID · `401` missing/invalid JWT · `404` not found

---

## Fences — `/api/v1/fence`

### `POST /api/v1/fence`
Create a new geofence.

**Body:** `CreateFenceDto`

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | `string` | yes | 1–120 chars |
| `description` | `string` | no | max 500 chars |
| `type` | `GeofenceType` | yes | `INCLUSION` \| `EXCLUSION` |
| `breachDirection` | `BreachDirection` | no | `ENTER` \| `EXIT` \| `BOTH`; default `BOTH` |
| `geometry` | `GeoJSONPolygon` | yes | `{ type: "Polygon", coordinates: number[][][] }` — ring-closure enforced in service layer |
| `active` | `boolean` | no | default `true` |
| `herdIds` | `string[]` | no | empty = applies to all devices |
| `alertCooldownSeconds` | `integer ≥ 0` | no | default `300` |
| `severity` | `"LOW"\|"MEDIUM"\|"HIGH"\|"CRITICAL"` | no | default `"MEDIUM"` |
| `metadata` | `object` | no | free-form JSON |
| `createdBy` | `string` | no | max 128 chars |

**Success:** `201` → `data: FenceResponse`
**Errors:** `400` validation (incl. invalid GeoJSON shape) · `401` missing/invalid JWT

---

### `GET /api/v1/fence`
List all fences, paginated.

**Query:** `page` (default `1`) · `limit` (default `20`, max `100`)

**Success:** `200` → `data: PaginatedResult<FenceResponse>`

---

### `GET /api/v1/fence/:id`
Get one fence by MongoDB ObjectId.

**Path:** `id` — MongoDB ObjectId string (validated by `ParseObjectIdPipe`)

**Success:** `200` → `data: FenceResponse`
**Errors:** `400` invalid ObjectId · `404` not found

---

### `PATCH /api/v1/fence/:id`
Partial update.

**Path:** `id` — MongoDB ObjectId
**Body:** `UpdateFenceDto` — all `CreateFenceDto` fields optional, plus optional `updatedBy: string`

**Success:** `200` → `data: FenceResponse`
**Errors:** `400` validation · `401` missing/invalid JWT · `404` not found

---

### `DELETE /api/v1/fence/:id`
Hard-delete a fence.

**Path:** `id` — MongoDB ObjectId

**Success:** `200` → `data: null`
**Errors:** `400` invalid ObjectId · `401` missing/invalid JWT · `404` not found

---

## Response shapes (reference)

### `Device`
```ts
{
  id: string;                    // UUID (Postgres PK)
  serialNumber: string;
  name: string;
  type: 'COLLAR_V1' | 'COLLAR_V2';
  status: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED' | 'LOST';
  herdId: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSeenAt: Date | null;
  batteryLevel: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### `FenceResponse`
```ts
{
  id: string;                    // MongoDB ObjectId as string
  name: string;
  description?: string;
  type: 'INCLUSION' | 'EXCLUSION';
  breachDirection: 'ENTER' | 'EXIT' | 'BOTH';
  geometry: { type: 'Polygon'; coordinates: number[][][]; };
  active: boolean;
  herdIds: string[];
  alertCooldownSeconds: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### `PaginatedResult<T>`
```ts
{
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; }
}
```
