# dashboard-ui

The HerdLink operator dashboard — service #9 in the [platform](../../docs/PRD.md#4-architecture-overview). A client-rendered React SPA; deliberately thin, no business logic of its own. See [docs/README.md](./docs/README.md) for the living service spec (responsibility, SLO, failure mode) and [docs/TODO.md](./docs/TODO.md) for built-vs-remaining against PRD milestones.

**Status:** early scaffold. There is no live map, alert feed, or real backend integration yet — see [What's built so far](#whats-built-so-far) and [Known gaps](#known-gaps).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | React 19 |
| Build tool / dev server | Vite 8 |
| Language | TypeScript (strict-ish, bundler module resolution — see [ADR-0001](../../docs/adr/0001-dashboard-ui-vite-module-resolution.md)) |
| Routing | React Router (`react-router-dom`, `createBrowserRouter`) |
| Server state / data fetching | TanStack Query (`@tanstack/react-query`) |
| Forms & validation | React Hook Form + Zod (`@hookform/resolvers/zod`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Unit / component tests | Vitest + React Testing Library + `jest-dom` |
| E2E tests | Playwright |
| Lint / format | ESLint (flat config) + Prettier, aligned with `device-service`'s convention |

## What's built so far

- **Routing shell** (`src/router.tsx`): `/` → the landing page, `/login` → the login page.
- **Landing page** (`src/App.tsx`): still the Vite/React starter demo content (counter, framework links) plus a "Sign in" link in the header — a placeholder for the future live map + alert feed, not real dashboard functionality yet.
- **Login page** (`src/pages/login/`): email/password form with client-side validation only (Zod schema in `login-schema.ts`) — required fields, email format, 8-char minimum password, inline error messages, disabled submit while "submitting". **Not wired to a real auth backend** — `onSubmit` currently just simulates a delay and logs to the console (see the `TODO(M3)` comment in `LoginPage.tsx`); real auth against `realtime-gateway`'s JWT endpoint is a milestone-3 item per the PRD.
- **Data-fetching plumbing**: a `QueryClientProvider` is wired at the app root (`src/main.tsx`, client in `src/lib/query-client.ts`) so components are ready to call `useQuery`/`useMutation` once `dashboard-api` / `realtime-gateway` exist. Nothing calls it yet.
- **Test tooling**: Vitest unit/component tests (`src/App.spec.tsx`, `src/pages/login/LoginPage.spec.tsx`) and Playwright e2e tests (`e2e/app.spec.ts`, `e2e/login.spec.ts`) covering the routes and login form validation above.

## Known gaps

- No live map (MapLibre), no alert feed, no device data — the PRD's M1 walking-skeleton scope for this service.
- No real authentication — the login form validates locally but doesn't call a backend.
- No backing services exist yet (`dashboard-api`, `realtime-gateway`), so there is nothing for TanStack Query to fetch from.
- No CI wiring for these test suites yet.

## Project structure

```
src/
  App.tsx                 # landing page (currently starter/demo content)
  App.spec.tsx
  main.tsx                # app entrypoint: StrictMode, QueryClientProvider, RouterProvider
  router.tsx               # route table
  lib/
    query-client.ts        # shared TanStack Query client
  pages/
    login/
      LoginPage.tsx
      LoginPage.spec.tsx
      login-schema.ts      # Zod schema + inferred form type
  test/
    setup.ts               # Vitest setup (jest-dom matchers, RTL cleanup)
e2e/
  app.spec.ts
  login.spec.ts
docs/                       # living service spec (README/ENDPOINTS/NETWORK/CHANGELOG/TODO)
```

## Running it

Requires Node (see repo root for the version in use) and npm.

```bash
cd apps/dashboard-ui
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server (default `http://localhost:5173`) with HMR.

### Build & preview production output

```bash
npm run build      # type-checks (tsc -b) then builds to dist/
npm run preview     # serves the built dist/ locally
```

### Lint & format

```bash
npm run lint         # ESLint over src/ and e2e/, --fix
npm run format       # Prettier --write over src/
```

### Unit / component tests (Vitest)

```bash
npm test                # run once
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

### End-to-end tests (Playwright)

```bash
npm run e2e       # headless run; auto-starts the dev server against http://localhost:5173
npm run e2e:ui    # interactive UI mode
```

First time only, Playwright needs its browser binary:

```bash
npx playwright install chromium
```
