# dashboard-ui — Network & I/O Contract

> Every byte in and out of this service. This is what you read before wiring it to anything else.
> Standards: [distributed-systems.mdc](../../../.cursor/rules/distributed-systems.mdc).

## Listening ports

| Port | Protocol | Purpose |
|---|---|---|
| `5173` | HTTP | Vite dev server (in-container / local `npm run dev`) |
| `3000` → `5173` | HTTP | Host port via `docker compose` (`dashboard-ui` service) |
| `<TBD>` | HTTP | Static asset server, production build |

## Kafka

None. `dashboard-ui` does not touch Kafka directly — it is a browser SPA, several hops downstream of the stream backbone.

## Datastores

None. Stateless SPA; all state is fetched from `device-service` at request time today (held in TanStack Query / `localStorage` for the session). Planned M3 sources: `dashboard-api` / `realtime-gateway`.

## Synchronous calls (outbound)

| Target service | Protocol | When | Circuit breaker | Failure behaviour |
|---|---|---|---|---|
| `device-service` | REST (HTTP), same-origin `/api/v1/...` via Vite dev proxy | on load and on user navigation — device/fence list/create/update/delete; `/login` form submission | n/a (browser fetch, no retry) | inline error via `ApiError` message, surfaced as a toast; mutations leave prior state untouched on failure |
| `dashboard-api` (planned, M3) | GraphQL (HTTP) | on load and on user navigation — device/fence/alert queries | n/a (browser fetch; retry with backoff) | show stale-data banner, retry |
| `realtime-gateway` (planned, M3) | WebSocket | held open for the lifetime of the dashboard session — live position/alert push | n/a (client reconnect logic) | fall back to last-known state, show "disconnected" indicator, auto-reconnect |

**Current status:** Devices, fences, and login are wired to the real `device-service` REST API (`src/lib/api/http.ts` — shared `fetch` wrapper; `src/lib/api/auth.ts` for login). Requests go same-origin under `/api/v1/...`; the Vite dev server proxies that prefix to `device-service` (`vite.config.ts`, target `VITE_API_PROXY_TARGET` or `http://localhost:3002`), so no CORS config is needed. Every successful response is unwrapped from device-service's `{ data, meta }` envelope; errors are parsed from `HttpExceptionFilter`'s `{ statusCode, error, message }` shape and re-thrown as `ApiError` with a user-facing message. Mutations (`POST`/`PATCH`/`DELETE`) attach `Authorization: Bearer <JWT>` from the token `AuthProvider` persisted at login (`localStorage`, key `herdlink.token`); `GET` requests are unauthenticated, matching device-service's public reads. `client.ts` remains "the swap point" for the pieces still pending a real backend: the dashboard's KPI trend lines are synthetic, and fence geometry is a client-supplied placeholder polygon until the map-draw editor lands (see TODO.md). `dashboard-api`/`realtime-gateway` don't exist yet; those rows are aspirational per the PRD.

## MQTT

Not applicable — this is a consumer-tier service, not edge/bridge.

## Observability emitted

- **Logs:** browser console only (no server-side process); consider a client error-reporting sink pre-M3.
- **Metrics:** none yet — <web vitals / RUM to be added>.
- **Traces:** `traceparent` originated here is propagated on outbound calls once tracing is wired (M3).
