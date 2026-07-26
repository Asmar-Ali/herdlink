# dashboard-ui — Endpoints

> `dashboard-ui` is a client-rendered SPA — it exposes no REST/GraphQL/WebSocket API of its own.
> It is a *consumer* of other services' APIs. Authoritative outbound I/O is in [NETWORK.md](./NETWORK.md);
> the table below is the currently-wired call surface (mirrored from `src/lib/api/`).

## REST (exposed)

None. No server-side controllers — static assets served by Vite (dev) / a static file server (prod).

## REST (consumed — current)

All calls are same-origin under `/api/v1/...`, proxied by Vite to `device-service`
(`vite.config.ts`, target `VITE_API_PROXY_TARGET` or `http://localhost:3002`).
Successful responses unwrap device-service's `{ data, meta }` envelope; errors surface as
`ApiError` from `{ statusCode, error, message }`. Mutations attach
`Authorization: Bearer <JWT>` (token from `localStorage` key `herdlink.token`).
Canonical request/response shapes live in [device-service ENDPOINTS.md](../../device-service/docs/ENDPOINTS.md).

| Method | Path | Auth | Used by | Notes |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | public | `src/lib/api/auth.ts` → Login | Demo credentials only; returns `{ token, user }` |
| `GET` | `/api/v1/device` | public | `listDevices` | Paginated; dashboard also uses `limit=100` for KPI totals |
| `POST` | `/api/v1/device` | JWT | `createDevice` | Body mirrors `CreateDeviceDto` |
| `PATCH` | `/api/v1/device/:id` | JWT | `updateDevice` | Partial update |
| `DELETE` | `/api/v1/device/:id` | JWT | `deleteDevice` | Hard delete |
| `GET` | `/api/v1/fence` | public | `listFences` | Paginated; dashboard also uses `limit=100` for KPI totals |
| `POST` | `/api/v1/fence` | JWT | `createFence` | Body mirrors `CreateFenceDto`; client injects `PLACEHOLDER_GEOMETRY` until the map-draw editor lands |
| `PATCH` | `/api/v1/fence/:id` | JWT | `updateFence` | Partial update (geometry optional; UI does not send it yet) |
| `DELETE` | `/api/v1/fence/:id` | JWT | `deleteFence` | Hard delete |

Not called yet (exist on device-service): `GET /api/v1/device/:id`, `GET /api/v1/fence/:id`.

## GraphQL

None exposed. Planned consumer of `dashboard-api` GraphQL at M3 — see [NETWORK.md](./NETWORK.md) / TODO.md.

## WebSocket

None exposed. Planned consumer of `realtime-gateway` WebSocket for live position/alert push at M1/M3 — see [NETWORK.md](./NETWORK.md) / TODO.md.
