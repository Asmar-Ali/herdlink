---
description: Report what is built vs remaining across the HerdLink platform
---

Produce a current build-status report for HerdLink. Read, don't guess.

Steps:

1. Read [docs/ROADMAP.md](../../docs/ROADMAP.md) for the platform-level board and milestone definitions in [docs/PRD.md](../../docs/PRD.md) (§8).
2. Read every `apps/*/docs/TODO.md` that exists for per-service detail.
3. **Reconcile** — if a service's `TODO.md` and its `ROADMAP.md` row disagree, flag it and trust the `TODO.md` (closer to the code); offer to fix the board.
4. **Spot-check reality** — list `apps/*/` directories; if a service exists in code but has no docs (or vice versa), flag the gap.

Report, concisely:
- **Per milestone (M1–M4):** % done and what's blocking completion.
- **Per service:** status (✅/🚧/⬜), current milestone, and the next concrete remaining item.
- **Shared libs & infra:** status.
- **Drift / gaps:** any TODO↔ROADMAP mismatches or code↔docs gaps found.
- **Suggested next action:** the highest-leverage thing to do next, tied to the PRD's milestone ordering (M1 walking skeleton is highest priority while incomplete).

Do not modify files unless the user asks you to fix flagged drift.
