# dashboard-ui — Changelog

> Per-service change history. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
> Update under `[Unreleased]` in the same change as the code. Categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added
- Docker Compose service `dashboard-ui` — Vite dev server on host `http://localhost:3000` (maps to container `5173`), with bind-mount + named `node_modules` volume for HMR.
- **Back-office portal shell** — protected app layout (`src/components/layout/`): left `Sidebar` (Dashboard / Devices / Fences nav + footer `SettingsMenu` for profile/logout), sticky `Header` with live-telemetry indicator. `AppLayout` composes them and code-splits the authed pages behind a `Suspense` fallback.
- **Auth session + route guard** — `AuthProvider` (`src/lib/auth/AuthProvider.tsx`) + `useAuth`/context (`src/lib/auth/auth-context.ts`) call `device-service`'s `POST /api/v1/auth/login` (`src/lib/api/auth.ts`) and persist the returned JWT + operator (`localStorage`, keys `herdlink.token`/`herdlink.session`). `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) redirects unauthenticated visitors to `/login` and preserves the intended destination.
- **Real device + fence CRUD** (`src/lib/api/`) — `client.ts` ("the swap point") now calls `device-service`'s REST API for both resources: `GET/POST/PATCH/DELETE /api/v1/device` and `/api/v1/fence`, via a shared `fetch` wrapper (`http.ts`) that unwraps the `{ data, meta }` envelope, attaches `Authorization: Bearer <JWT>` on mutations, and turns backend error envelopes into a message-bearing `ApiError` for the existing toast/error handling. Requests are same-origin under `/api/v1/...`, proxied to `device-service` by Vite (`vite.config.ts`) — no CORS setup needed. `types.ts` still mirrors `device-service`'s DTOs, so no component or hook signature changed. Fence creation supplies a placeholder GeoJSON polygon (`PLACEHOLDER_GEOMETRY` in `client.ts`) since the map-draw editor hasn't landed; the dashboard's device/fence totals are now derived from the live lists instead of an in-memory fixture store, so KPI tiles and the tables never disagree. Only the KPI trend lines remain synthetic (no stats endpoint yet). TanStack Query hooks (`hooks.ts`) are unchanged: `useDevices/useFences/useDashboardStats` + create/update/delete mutations.
- Co-located tests for the real API layer: `auth.spec.ts` (login), `client.spec.ts` (device + fence CRUD — envelope unwrapping, bearer token attachment, placeholder-geometry injection, backend validation/network error surfacing).
- **Dashboard page** (`src/pages/dashboard/`) — KPI stat tiles (active devices, geofences, avg battery, lost devices) + three Recharts visualizations (active-devices area trend, fleet-status donut, geofence-breaches bar) using the validated data-viz palette wired to theme-aware CSS variables (`src/components/charts/`).
- **Devices page** (`src/pages/devices/`) — searchable/filterable table with battery meters, last-position/last-seen, pagination, and a create/edit modal (`react-hook-form` + `zod`, constraints mirroring `CreateDeviceDto`) with delete confirmation.
- **Fences page** (`src/pages/fences/`) — geofence table (type/severity/breach-direction/applies-to/state badges), pagination, and a create/edit modal mirroring `CreateFenceDto` (polygon geometry deferred to the map editor) with delete confirmation.
- **Toasts** — `sonner` `Toaster` mounted at the app root; success/error toasts on login, logout, and every device/fence mutation.
- **Shared UI kit** (`src/components/ui/`) — `Button`, `Badge`/status badges, `Card`, `Modal`, `ConfirmDialog`, `Field`/inputs, `Table`, `Pagination`, `StatTile`, `EmptyState`, `Spinner`, and a dependency-free stroke `Icon` set.
- Dependencies: `recharts` (charts), `sonner` (toasts).
- Scaffolded service via Vite (`react-ts` template): React 19, TypeScript, Vite build/dev tooling.
- ESLint (flat config) + Prettier aligned with the platform convention used by `device-service`.
- TanStack Query (`@tanstack/react-query`), `QueryClientProvider` wired at the app root (`src/main.tsx`, client in `src/lib/query-client.ts`) — used by device/fence/dashboard hooks against `device-service`.
- Unit/component testing: Vitest + React Testing Library + `jest-dom`, jsdom environment, config in `vite.config.ts` (`test` block) + `src/test/setup.ts`, sample test `src/App.spec.tsx`. Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`.
- E2E testing: Playwright (`@playwright/test`, Chromium installed locally), config in `playwright.config.ts` (auto-starts the Vite dev server), sample test `e2e/app.spec.ts`. Scripts: `npm run e2e`, `npm run e2e:ui`.
- Client-side routing: `react-router-dom`, `createBrowserRouter` wired at the app root (`src/router.tsx`, rendered via `RouterProvider` in `src/main.tsx`). Routes: `/` (existing scaffold page) and `/login`.
- Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) wired into the Vite build (`vite.config.ts`) and imported in `src/index.css`; reuses the existing light/dark CSS custom properties rather than introducing a parallel theme.
- Login page (`src/pages/login/LoginPage.tsx`): responsive email/password form validated with `react-hook-form` + `zod` (`@hookform/resolvers`, schema in `src/pages/login/login-schema.ts`). Submission calls `device-service`'s `POST /api/v1/auth/login` (demo credentials only — see that service's `docs/README.md`); a dedicated `realtime-gateway`/`dashboard-api` identity flow is still planned for M3.
- Unit tests for the login page (`src/pages/login/LoginPage.spec.tsx`) and e2e coverage (`e2e/login.spec.ts`); `afterEach(cleanup)` added to `src/test/setup.ts` so multi-test spec files don't leak DOM state between tests.
- "Sign in" link added to the scaffold home page (`src/App.tsx`) for navigation to `/login`.

### Changed
- `SettingsMenu` moved from a fixed bottom-right FAB into the `Sidebar` footer (popover opens upward above the gear).
- Routing restructured: `/login` (public) + a protected group (`ProtectedRoute` → `AppLayout`) with `/` (dashboard), `/devices`, `/fences`. Authed pages are lazy-loaded so Recharts ships in the dashboard chunk (~400 kB) rather than the initial bundle.
- `index.css` reworked from the single-column scaffold layout into the app-shell token system: added surface/sidebar/border tokens, a fixed status palette, and the validated categorical chart palette as CSS variables for both light and dark.
- Login page now calls `AuthProvider.login`, toasts a welcome, and redirects to the intended route instead of stubbing the submit.
- Removed the Vite starter landing page (`src/App.tsx`, `App.css`, `App.spec.tsx`); e2e/unit tests updated for the auth flow.

### Fixed
- UI copy casing: interactive chrome (buttons, field labels, select options, badges, table headers, chart titles) uses Title Case (`Create Geofence`, `titleCase()` for enums). Body/description/error prose stays sentence case. Table headers no longer force CSS `uppercase`.
