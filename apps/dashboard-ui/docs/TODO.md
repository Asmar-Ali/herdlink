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
- [x] Login page UI (`src/pages/login/LoginPage.tsx`) — `react-hook-form` + `zod`; calls `device-service`'s real `POST /api/v1/auth/login` and redirects on success
- [x] **Back-office portal shell** — sidebar (nav + footer settings/profile) + header (`src/components/layout/`)
- [x] **Auth + route guard** — `AuthProvider` persists the JWT + operator returned by `device-service`'s login endpoint (`localStorage`); `ProtectedRoute` guards the authed routes
- [x] **Toasts** — `sonner` mounted at root; success/error on login, logout, and all mutations
- [x] **Dashboard** — KPI stat tiles + Recharts charts (active-devices trend, status donut, breaches bar); device/fence totals derived from the live API lists
- [x] **Devices** — searchable/filterable table + create/edit modal (mirrors `CreateDeviceDto`) + delete confirmation, wired to `device-service`'s `/api/v1/device`
- [x] **Fences** — geofence table + create/edit modal (mirrors `CreateFenceDto`, geometry deferred) + delete confirmation, wired to `device-service`'s `/api/v1/fence`
- [x] **Real API layer** (`src/lib/api/`) — `http.ts` shared `fetch` wrapper (envelope unwrap, bearer token, error surfacing) backs `client.ts` ("the swap point") for devices, fences, and login; TanStack Query hooks (`hooks.ts`) unchanged
- [x] Shared UI kit (`src/components/ui/`) — buttons, badges, cards, modal, table, pagination, stat tile, icons, etc.
- [x] Docker Compose wiring — `dashboard-ui` service, host `:3000` → Vite `:5173`; `VITE_API_PROXY_TARGET` routes `/api` to `device-service`

## In progress 🚧

- [ ] none currently

## Remaining ⬜

### M1 — Walking skeleton
- [ ] Minimal map (MapLibre) rendering one device's live position
- [ ] Wire to `realtime-gateway` WebSocket for live position push
- [ ] Health/error states for backend unavailability

### M2 — Scale, geofences, domain
- [ ] Render 1,000 device dots without perf degradation
- [ ] Draw-fence UI (map polygon editor) — fence CRUD is wired to the real API; geometry is currently a client-supplied placeholder polygon (`PLACEHOLDER_GEOMETRY` in `client.ts`) until this lands
- [ ] Real dashboard aggregate/stats endpoint (KPI totals are live; trend lines are still synthesized client-side)

### M3 — Alerting, GraphQL, production patterns
- [ ] Alert feed (consumes `dashboard-api` GraphQL + `realtime-gateway` push)
- [ ] Migrate auth from `device-service`'s demo login to `realtime-gateway`'s/`dashboard-api`'s production identity flow (public surface unchanged)
- [ ] Distributed tracing (`traceparent` propagation on outbound calls)

## Known gaps / tech debt

- `dashboard-api` and `realtime-gateway` don't exist yet — devices, fences, and login call `device-service` directly (same-origin `/api/v1/...` via the Vite proxy). This is a deliberate interim wiring, not a mock.
- Login uses `device-service`'s hardcoded demo credentials (`rancher@herdlink.io` / `herdlink-demo`) — no signup flow or per-operator accounts until a real identity service lands.
- Dashboard KPI totals (device/fence counts, status breakdown, avg battery) are live; the trend-line charts are still client-synthesized — no time-series aggregate endpoint yet.
- Fence geometry is a fixed placeholder polygon on create — the map-draw editor (M2) is what lets operators define real boundaries.
