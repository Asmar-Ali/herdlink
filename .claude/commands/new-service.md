---
description: Scaffold a new HerdLink service's docs and register it across the platform
argument-hint: <service-name> (e.g. ingestion-service)
---

Scaffold and register a new service named **$1** in the HerdLink monorepo. Do NOT generate application source code unless explicitly asked — this command sets up the service's documentation and platform registration so it follows the lifecycle from day one.

Steps:

1. **Validate** `$1` is one of the planned services in [docs/PRD.md](../../docs/PRD.md) (§4) or confirm with the user that a new service is intended. Use the exact kebab-case name (`<name>-service` convention).
2. **Create `apps/$1/docs/`** by copying every file from [docs/templates/service/](../../docs/templates/service/) (`README.md`, `ENDPOINTS.md`, `NETWORK.md`, `CHANGELOG.md`, `TODO.md`).
3. **Fill the placeholders** in the copied files from the PRD: service name, responsibility, milestone, tier, primary stores, and an initial SLO. Leave endpoint/topic details as `<…>` placeholders to be filled as the code is built.
4. **Register the service**:
   - Update its row in [docs/ROADMAP.md](../../docs/ROADMAP.md) (status `🚧 In progress`, link to its docs).
   - Add it to the repo map / service list in [CLAUDE.md](../../CLAUDE.md) if not already implied.
5. **Design pass** — invoke the `designing-a-service` skill and point the user at the relevant `.cursor/rules/*.mdc` standards for the work ahead.
6. **Capture decisions** — if standing up the service involves a non-obvious choice (new datastore, new topic, partitioning), prompt to run `/new-adr`.

Report what was created and the suggested next step (typically: write the failing test, then the module).
