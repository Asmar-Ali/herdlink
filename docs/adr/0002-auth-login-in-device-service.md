# ADR-0002: Auth login lives in device-service (interim)

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** HerdLink engineering

## Context

`dashboard-ui` needs a real JWT to call device-service write routes (`POST` /
`PATCH` / `DELETE` on devices and fences). The PRD puts production identity on
`realtime-gateway` / a dedicated auth path at M3, but those services do not
exist yet. Shipping the portal against an in-memory auth shim left mutations
unable to hit the real API.

## Decision

Add a demo-only `POST /api/v1/auth/login` to `device-service`:

- Public (`@Public()`); validates a single hardcoded operator
  (`rancher@herdlink.io` / `herdlink-demo`).
- Issues an HS256 bearer JWT via shared `@herdlink/auth` `TokenService`, plus a
  session user shaped for `dashboard-ui`'s `AuthUser`.
- No signup, password hashing, refresh, or multi-tenant accounts.

`dashboard-ui` calls this endpoint through the Vite `/api` proxy and persists
`token` + `user` in `localStorage`.

## Consequences

- **Positive:** Portal fence/device CRUD works end-to-end against real Postgres /
  Mongo without standing up a new service.
- **Positive:** JWT verification path is the same one write routes already use.
- **Negative:** Auth is coupled to the device registry service — wrong long-term
  home; must migrate when `realtime-gateway` / identity lands (public login
  surface may move; SPA swap point is `src/lib/api/auth.ts`).
- **Negative:** Shared demo credentials are unsuitable beyond local/dev demos.

## Alternatives considered

1. **Keep a client-only auth shim** — rejected; mutations need a real JWT the
   backend will accept.
2. **Stand up `realtime-gateway` early just for login** — rejected; out of scope
   for the current milestone and blocks fence wiring on a larger service.
3. **Mint tokens offline / env-injected into the SPA** — rejected; breaks the
   login UX and still needs a documented credential story for demos.
