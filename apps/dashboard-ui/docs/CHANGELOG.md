# dashboard-ui — Changelog

> Per-service change history. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
> Update under `[Unreleased]` in the same change as the code. Categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added
- **Back-office portal shell** — protected app layout (`src/components/layout/`): left `Sidebar` (Dashboard / Devices / Fences nav), sticky `Header` with live-telemetry indicator, and a fixed bottom-right `SettingsMenu` dropdown (user profile + logout). `AppLayout` composes them and code-splits the authed pages behind a `Suspense` fallback.
- **Auth session + route guard** — `AuthProvider` (`src/lib/auth/AuthProvider.tsx`) + `useAuth`/context (`src/lib/auth/auth-context.ts`) holding a fake session in `localStorage`; `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) redirects unauthenticated visitors to `/login` and preserves the intended destination. Login is wired to it (redirect on success). **Still a shim** — swaps for `realtime-gateway`'s JWT endpoint at M3 (public surface unchanged).
- **Typed mock data layer** (`src/lib/api/`) — client-side mirrors of `device-service`'s Device/Geofence entities (`types.ts`), deterministic seed fixtures (`fixtures.ts`), and an in-memory fake API (`client.ts`, "the swap point") that simulates latency and persists CRUD across a session. TanStack Query hooks (`hooks.ts`) expose `useDevices/useFences/useDashboardStats` + create/update/delete mutations. Replacing `client.ts` bodies with `fetch('/api/v1/...')` is the only change needed once `dashboard-api` ships.
- **Dashboard page** (`src/pages/dashboard/`) — KPI stat tiles (active devices, geofences, avg battery, lost devices) + three Recharts visualizations (active-devices area trend, fleet-status donut, geofence-breaches bar) using the validated data-viz palette wired to theme-aware CSS variables (`src/components/charts/`).
- **Devices page** (`src/pages/devices/`) — searchable/filterable table with battery meters, last-position/last-seen, pagination, and a create/edit modal (`react-hook-form` + `zod`, constraints mirroring `CreateDeviceDto`) with delete confirmation.
- **Fences page** (`src/pages/fences/`) — geofence table (type/severity/breach-direction/applies-to/state badges), pagination, and a create/edit modal mirroring `CreateFenceDto` (polygon geometry deferred to the map editor) with delete confirmation.
- **Toasts** — `sonner` `Toaster` mounted at the app root; success/error toasts on login, logout, and every device/fence mutation.
- **Shared UI kit** (`src/components/ui/`) — `Button`, `Badge`/status badges, `Card`, `Modal`, `ConfirmDialog`, `Field`/inputs, `Table`, `Pagination`, `StatTile`, `EmptyState`, `Spinner`, and a dependency-free stroke `Icon` set.
- Dependencies: `recharts` (charts), `sonner` (toasts).
- Scaffolded service via Vite (`react-ts` template): React 19, TypeScript, Vite build/dev tooling.
- ESLint (flat config) + Prettier aligned with the platform convention used by `device-service`.
- TanStack Query (`@tanstack/react-query`), `QueryClientProvider` wired at the app root (`src/main.tsx`, client in `src/lib/query-client.ts`) — ready for API calls once `dashboard-api`/`realtime-gateway` exist.
- Unit/component testing: Vitest + React Testing Library + `jest-dom`, jsdom environment, config in `vite.config.ts` (`test` block) + `src/test/setup.ts`, sample test `src/App.spec.tsx`. Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`.
- E2E testing: Playwright (`@playwright/test`, Chromium installed locally), config in `playwright.config.ts` (auto-starts the Vite dev server), sample test `e2e/app.spec.ts`. Scripts: `npm run e2e`, `npm run e2e:ui`.
- Client-side routing: `react-router-dom`, `createBrowserRouter` wired at the app root (`src/router.tsx`, rendered via `RouterProvider` in `src/main.tsx`). Routes: `/` (existing scaffold page) and `/login`.
- Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) wired into the Vite build (`vite.config.ts`) and imported in `src/index.css`; reuses the existing light/dark CSS custom properties rather than introducing a parallel theme.
- Login page (`src/pages/login/LoginPage.tsx`): responsive email/password form validated with `react-hook-form` + `zod` (`@hookform/resolvers`, schema in `src/pages/login/login-schema.ts`). Submission is currently stubbed client-side — not yet wired to `realtime-gateway`'s JWT auth endpoint (planned M3, see TODO.md).
- Unit tests for the login page (`src/pages/login/LoginPage.spec.tsx`) and e2e coverage (`e2e/login.spec.ts`); `afterEach(cleanup)` added to `src/test/setup.ts` so multi-test spec files don't leak DOM state between tests.
- "Sign in" link added to the scaffold home page (`src/App.tsx`) for navigation to `/login`.

### Changed
- Routing restructured: `/login` (public) + a protected group (`ProtectedRoute` → `AppLayout`) with `/` (dashboard), `/devices`, `/fences`. Authed pages are lazy-loaded so Recharts ships in the dashboard chunk (~400 kB) rather than the initial bundle.
- `index.css` reworked from the single-column scaffold layout into the app-shell token system: added surface/sidebar/border tokens, a fixed status palette, and the validated categorical chart palette as CSS variables for both light and dark.
- Login page now calls `AuthProvider.login`, toasts a welcome, and redirects to the intended route instead of stubbing the submit.
- Removed the Vite starter landing page (`src/App.tsx`, `App.css`, `App.spec.tsx`); e2e/unit tests updated for the auth flow.

### Fixed
- n/a
