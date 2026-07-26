# dashboard-ui — Network & I/O Contract

> Every byte in and out of this service. This is what you read before wiring it to anything else.
> Standards: [distributed-systems.mdc](../../../.cursor/rules/distributed-systems.mdc).

## Listening ports

| Port | Protocol | Purpose |
|---|---|---|
| `5173` | HTTP | Vite dev server |
| `<TBD>` | HTTP | Static asset server, production build |

## Kafka

None. `dashboard-ui` does not touch Kafka directly — it is a browser SPA, several hops downstream of the stream backbone.

## Datastores

None. Stateless SPA; all state is fetched from `dashboard-api` / `realtime-gateway` at request/connect time, held in memory client-side.

## Synchronous calls (outbound)

| Target service | Protocol | When | Circuit breaker | Failure behaviour |
|---|---|---|---|---|
| `dashboard-api` | GraphQL (HTTP) | on load and on user navigation — device/fence/alert queries | n/a (browser fetch; retry with backoff) | show stale-data banner, retry |
| `realtime-gateway` | WebSocket | held open for the lifetime of the dashboard session — live position/alert push | n/a (client reconnect logic) | fall back to last-known state, show "disconnected" indicator, auto-reconnect |
| `realtime-gateway` (planned, M3) | HTTP (JWT auth) | on `/login` form submission | n/a (browser fetch) | show inline auth error, allow retry |

**Current status:** No outbound network calls are live yet. The portal (dashboard/devices/fences) runs entirely against a **typed in-memory mock** (`src/lib/api/`) shaped to `device-service`'s DTOs — `client.ts` is the single swap point where `fetch('/api/v1/...')` calls to `dashboard-api` will replace the fakes (signatures/return types already match). `/login` uses a `localStorage` auth shim (`AuthProvider`), not `realtime-gateway`'s JWT endpoint yet. See TODO.md.

## MQTT

Not applicable — this is a consumer-tier service, not edge/bridge.

## Observability emitted

- **Logs:** browser console only (no server-side process); consider a client error-reporting sink pre-M3.
- **Metrics:** none yet — <web vitals / RUM to be added>.
- **Traces:** `traceparent` originated here is propagated to `dashboard-api` calls once tracing is wired (M3).
