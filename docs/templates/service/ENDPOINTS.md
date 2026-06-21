# <service-name> — Endpoints

> The externally callable API surface. Keep in sync with controllers/resolvers/gateways.
> Conventions: global prefix `api` + URI versioning → paths are `/api/v1/...`. Successful REST responses are wrapped in the `{ data, meta }` envelope; list endpoints return a `PaginatedResult` (`{ items, pagination }`) inside `data`. Errors are shaped by the global exception filter.

## REST

### `<METHOD> /api/v1/<path>`

- **Summary:** <what it does>
- **Auth:** <none | JWT>
- **Path params:** `<name>` — `<type>` — <notes>
- **Query params:** <e.g., `page`, `limit` (PaginationQueryDto)>
- **Request body:** `<CreateXDto>` — <key fields + validation>
- **Success:** `<200 | 201 | 204>` → `data: <shape>`
- **Errors:** `400` validation · `404` not found · `409` conflict · `<other>`

<!-- Repeat per endpoint. Group by resource. -->

## GraphQL

> Only if this service exposes GraphQL (e.g., dashboard-api). Otherwise delete this section.

- **Queries:** `<name>(<args>): <Type>` — <description>
- **Mutations:** `<name>(<input>): <Type>` — <description>
- **Notes:** DataLoader on nested fields hitting a datasource (N+1 prevention).

## WebSocket

> Only if this service exposes WebSocket (e.g., realtime-gateway). Otherwise delete this section.

- **Namespace / path:** `<path>`
- **Auth:** JWT verified in `handleConnection`
- **Rooms:** `<e.g., farm:${farmId}>`
- **Server → client events:** `<event>` — `<payload>`
- **Client → server events:** `<event>` — `<payload>`
