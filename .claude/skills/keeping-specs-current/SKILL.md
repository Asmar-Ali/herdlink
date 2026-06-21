---
name: keeping-specs-current
description: Use whenever code changes alter a service's API, I/O, or behaviour — after adding/changing an endpoint, Kafka topic, datastore, dependency, or config — to update that service's living specs in the same change. Triggers on "update the specs", "update the docs", "I added an endpoint/topic", "document this change", finishing a feature, or preparing a commit/PR. Also fires the discipline of writing an ADR for non-obvious decisions.
---

# Keeping specs current

Code and its docs ship **together, never separately**. When you change a service, update its colocated living specs in the same change. (`/sync-specs` automates the bulk of this.)

## Where the specs live
`apps/<service>/docs/` — modeled on [`docs/templates/service/`](../../../docs/templates/service/):
- `ENDPOINTS.md` — REST/GraphQL/WS surface.
- `NETWORK.md` — Kafka topics, datastores, sync calls, ports, MQTT.
- `CHANGELOG.md` — Keep-a-Changelog, under `[Unreleased]`.
- `TODO.md` — built vs remaining.
- `README.md` — responsibility, SLO, failure mode.

## What to update, by change type
| You changed… | Update |
|---|---|
| A controller/resolver/gateway route | `ENDPOINTS.md` + `CHANGELOG.md` |
| A Kafka topic, datastore, port, or outbound sync call | `NETWORK.md` + `CHANGELOG.md` |
| Completed/started a capability | `TODO.md` + the service row in [`ROADMAP.md`](../../../docs/ROADMAP.md) |
| Responsibility, SLO, or failure mode | `README.md` |
| A decision with real trade-offs | a new ADR via `/new-adr` |
| A standard/convention | the relevant [`.cursor/rules/*.mdc`](../../../.cursor/rules/) (single source) — not a spec |

## Checklist before considering a change done
1. Specs for every touched service reflect the new reality (no stale endpoints/topics).
2. `CHANGELOG.md [Unreleased]` has an entry in the right category; breaking changes flagged.
3. `TODO.md` and `ROADMAP.md` agree on status.
4. Non-obvious decision captured as an ADR; standard change landed in the `.mdc`.
5. Conventions still match `device-service` / [CLAUDE.md](../../../CLAUDE.md) — don't silently diverge.

Stale docs are worse than no docs. If you can't update them now, the change isn't finished.
