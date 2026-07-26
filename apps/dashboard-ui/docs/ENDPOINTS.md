# dashboard-ui — Endpoints

> `dashboard-ui` is a client-rendered SPA — it exposes no REST/GraphQL/WebSocket API of its own.
> It is a *consumer* of other services' APIs; see [NETWORK.md](./NETWORK.md) for what it calls outbound.

## REST

None. No server-side controllers — static assets served by Vite (dev) / a static file server (prod).

## GraphQL

None exposed. Consumes `dashboard-api`'s GraphQL API — see [NETWORK.md](./NETWORK.md) for the outbound contract; document specific queries/mutations used here as screens are built.

## WebSocket

None exposed. Consumes `realtime-gateway`'s WebSocket for live position/alert push — see [NETWORK.md](./NETWORK.md).
