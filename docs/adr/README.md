# Architecture Decision Records

This directory holds the **why** behind HerdLink's non-obvious technical choices. Standards (the *how*) live in [`.cursor/rules/*.mdc`](../../.cursor/rules/); requirements (the *what*) live in [PRD.md](../PRD.md). ADRs capture the reasoning at a point in time so a future reader (or a new Claude session) understands a decision without re-deriving it.

## When to write one

Write an ADR when a choice:

- has realistic alternatives with genuine trade-offs (e.g., Kafka vs RabbitMQ, choreography vs orchestration, partition key choice);
- is hard or expensive to reverse later;
- will be questioned in code review or an interview ("why did you…?");
- changes or extends a standard in `.cursor/rules`.

Do **not** write one for routine, conventional choices already covered by a standard.

## How to write one

Run `/new-adr <short title>` (copies the template, assigns the next number, links it here), or copy [`0000-adr-template.md`](./0000-adr-template.md) manually. Keep it short — one page. Mark superseded ADRs as such rather than deleting them; the history is part of the record.

## Index

| ADR | Title | Status |
|---|---|---|
| [0000](./0000-adr-template.md) | ADR template | — (template) |

<!-- /new-adr appends new rows here. Candidate ADRs from the PRD/README: Kafka over RabbitMQ; polyglot persistence (Timescale/Mongo/Redis); telemetry partition key = device_id; outbox in alerting-service; idempotency strategy; GraphQL alongside REST. -->
