# dashboard-ui — TODO

> Built vs remaining for this service, tracked against [PRD milestones](../../../docs/PRD.md#8-milestones).
> When the balance shifts, also update the service's row in [ROADMAP.md](../../../docs/ROADMAP.md). `/status` reads this file.

**Overall status:** 🚧 In progress
**Current milestone:** M1

## Built ✅

- [x] Project scaffolded — Vite + React 19 + TypeScript, ESLint/Prettier wired to platform conventions
- [x] TanStack Query wired at the app root, ready for API calls
- [x] Test tooling — Vitest + React Testing Library (unit/component), Playwright (e2e), tests passing
- [x] Client-side routing (`react-router-dom`) — `/login` + protected group (`/`, `/devices`, `/fences`); authed pages lazy-loaded
- [x] Tailwind CSS (`@tailwindcss/vite`) wired for styling; app-shell + validated chart palette tokens in `index.css` (light/dark)
- [x] Login page UI (`src/pages/login/LoginPage.tsx`) — `react-hook-form` + `zod`; now redirects on success via the auth shim
- [x] **Back-office portal shell** — sidebar + header + fixed bottom-right settings/profile dropdown (`src/components/layout/`)
- [x] **Auth shim + route guard** — `AuthProvider` (localStorage session) + `ProtectedRoute`; public surface matches the eventual JWT flow
- [x] **Toasts** — `sonner` mounted at root; success/error on login, logout, and all mutations
- [x] **Dashboard** — KPI stat tiles + Recharts charts (active-devices trend, status donut, breaches bar)
- [x] **Devices** — searchable/filterable table + create/edit modal (mirrors `CreateDeviceDto`) + delete confirmation
- [x] **Fences** — geofence table + create/edit modal (mirrors `CreateFenceDto`, geometry deferred) + delete confirmation
- [x] **Typed mock data layer** (`src/lib/api/`) — fixtures + in-memory fake API behind TanStack Query; single swap point (`client.ts`) for real HTTP
- [x] Shared UI kit (`src/components/ui/`) — buttons, badges, cards, modal, table, pagination, stat tile, icons, etc.

## In progress 🚧

- [ ] none currently

## Remaining ⬜

### M1 — Walking skeleton
- [ ] Minimal map (MapLibre) rendering one device's live position
- [ ] Wire to `realtime-gateway` WebSocket for live position push
- [ ] Health/error states for backend unavailability

### M2 — Scale, geofences, domain
- [ ] Render 1,000 device dots without perf degradation
- [ ] Draw-fence UI (map polygon editor) — fence CRUD UI exists; geometry is currently a placeholder polygon
- [ ] Swap the typed mock layer (`src/lib/api/client.ts`) for real `dashboard-api` / `device-service` HTTP calls — signatures/return types already match
- [ ] Real dashboard aggregate/stats endpoint (currently derived client-side from the mock store)

### M3 — Alerting, GraphQL, production patterns
- [ ] Alert feed (consumes `dashboard-api` GraphQL + `realtime-gateway` push)
- [ ] Wire the login page's submit handler to `realtime-gateway`'s JWT auth endpoint (UI already built in `src/pages/login/`, currently stubbed) and persist the session
- [ ] Distributed tracing (`traceparent` propagation on outbound calls)

## Known gaps / tech debt

- No backing services (`dashboard-api`, `realtime-gateway`) exist yet. The portal runs against a **typed in-memory mock** (`src/lib/api/`) shaped to `device-service`'s DTOs — real data lands by replacing `client.ts` bodies with `fetch`.
- Auth is a **localStorage shim** (`AuthProvider`) — any valid email + 8+ char password signs in. No real credential check, token, or refresh until the M3 JWT wiring.
- Dashboard stats (KPIs, trends, breaches) are derived/synthesized client-side — no server aggregate endpoint, and breach counts are illustrative mock data.
- Mutations (create/edit/delete) persist only in memory for the session; they reset on reload.
