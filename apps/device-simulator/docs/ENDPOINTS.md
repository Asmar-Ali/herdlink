# device-simulator — Endpoints

> `device-simulator` is a publish-only MQTT worker with no REST/GraphQL/WebSocket surface. Its only HTTP surface is a liveness probe.

## Health check

### `GET /health`

- **Summary:** Returns 200 while the MQTT client reports connected, 503 otherwise. Used by Docker's healthcheck and the M1 "health checks" deliverable.
- **Auth:** none
- **Success:** `200` → `{ "status": "ok" }`
- **Failure:** `503` → `{ "status": "unhealthy" }`

See [NETWORK.md](./NETWORK.md) for the port this listens on.
