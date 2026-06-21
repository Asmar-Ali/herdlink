---
description: Update a service's living specs (endpoints, network, changelog, todo) to match the current code
argument-hint: "[service-name] (optional; defaults to services touched by the current diff)"
---

Bring the colocated living specs in line with the code. This enforces the rule that code and docs ship together. Apply the `keeping-specs-current` skill.

Scope:
- If `$1` is given, sync `apps/$1/docs/`.
- Otherwise, determine touched services from the working tree: run `git status --short` and `git diff --name-only` (and `git diff --name-only --cached`) and map changed `apps/<service>/...` paths to their services.

For each in-scope service, read its source and update `apps/<service>/docs/`:

1. **ENDPOINTS.md** — reconcile against controllers/resolvers/gateways. Every route present with method, `/api/v1/...` path, auth, request DTO, response (remember the `{ data, meta }` envelope and `PaginatedResult` for lists), and status codes. Remove deleted routes.
2. **NETWORK.md** — reconcile Kafka topics consumed/produced (group id, key, idempotency key, DLQ), datastores + key/table/collection patterns, outbound sync calls, listening ports, MQTT.
3. **CHANGELOG.md** — add entries under `[Unreleased]` in the correct category (Added/Changed/Deprecated/Removed/Fixed/Security); flag breaking changes explicitly.
4. **TODO.md** — move completed items to Built, update In-progress/Remaining, then update the service's row in [docs/ROADMAP.md](../../docs/ROADMAP.md) so they agree.
5. **README.md** — update responsibility/SLO/failure-mode only if they changed.

Do NOT modify application source. Do NOT copy `.cursor/rules` content into specs — a standard change belongs in the `.mdc`. End by listing exactly which spec files changed and flag any drift you could not resolve automatically.
