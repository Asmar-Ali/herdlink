---
description: Create the next numbered Architecture Decision Record from the template
argument-hint: <short decision title>
---

Create a new ADR titled **$ARGUMENTS** in [docs/adr/](../../docs/adr/).

Steps:

1. **Determine the next number** — list `docs/adr/*.md`, find the highest `NNNN` prefix (ignoring `0000-adr-template.md`), and use the next zero-padded integer (first real ADR is `0001`).
2. **Create the file** `docs/adr/NNNN-<kebab-title>.md` by copying [docs/adr/0000-adr-template.md](../../docs/adr/0000-adr-template.md). Fill the heading (`# ADR-NNNN: $ARGUMENTS`), set Status to `Proposed`, today's date, and pre-fill any Context you already have from the conversation.
3. **Draft Context / Decision / Alternatives considered / Consequences** based on the discussion. If alternatives aren't clear yet, leave prompts — but never an ADR with zero alternatives.
4. **Link the relevant standard** — if the decision touches or changes a `.cursor/rules/*.mdc`, reference it; if it *changes* a standard, note the follow-up to update that `.mdc` (the single source of truth).
5. **Index it** — append a row to the table in [docs/adr/README.md](../../docs/adr/README.md).

Report the new ADR path and remind the user to flip its Status to `Accepted` once decided.
