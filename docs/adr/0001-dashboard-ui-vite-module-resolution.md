# ADR-0001: dashboard-ui uses Vite bundler module resolution, not the explicit `.js`-extension ESM convention

- **Status:** Accepted
- **Date:** 2026-07-25
- **Deciders:** asmarali
- **Related:** [CLAUDE.md — Established conventions](../../CLAUDE.md#established-conventions-copy-from-device-service)

## Context

CLAUDE.md establishes, from `device-service`, that this is an ESM project and imports use explicit `.js` specifiers (e.g. `import { X } from './x.js'`). That convention exists because the NestJS services run under Node's native ESM loader with `moduleResolution: "nodenext"`, which requires the specifier to match the compiled output file.

`dashboard-ui` (scaffolded via `npm create vite@latest -- --template react-ts`) is a browser SPA built by Vite/esbuild/Rollup, not executed by Node's module loader. Vite's TypeScript template uses `moduleResolution: "bundler"`, and the standard React/Vite convention is to import components without extensions (`import App from './App'`), with `.tsx`/`.css` etc. resolved by the bundler.

## Decision

`dashboard-ui` keeps Vite's default **bundler** module resolution and does **not** use explicit `.js` import specifiers. This applies only to `dashboard-ui`; every Node-executed service (NestJS backends) still follows the `nodenext` + explicit-`.js` convention unchanged.

## Alternatives considered

- **Force `nodenext` + `.js` specifiers in dashboard-ui, for repo-wide consistency** — rejected: Vite doesn't execute through Node's resolver, so this would fight the toolchain (HMR, asset imports, `.tsx` resolution) for a consistency benefit that has no functional payoff in a bundler context.
- **Use a fully custom build (no Vite) so nodenext could apply throughout** — rejected: reinvents bundler tooling that Vite provides for free, contradicts the ask to use Vite's own TS boilerplate.

## Consequences

- **Positive:** dashboard-ui matches standard React/Vite tooling conventions that any frontend engineer will recognize; no fighting the bundler.
- **Negative / trade-offs:** the "explicit `.js` specifiers" line in CLAUDE.md is no longer true repo-wide as stated; a reader moving from a NestJS service to `dashboard-ui` will see import style change.
- **Follow-ups:** CLAUDE.md's established-conventions section should note this convention is scoped to Node-executed (NestJS) services, not `dashboard-ui`.
