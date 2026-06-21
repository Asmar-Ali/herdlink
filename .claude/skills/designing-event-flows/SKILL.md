---
name: designing-event-flows
description: Use when designing asynchronous/event-driven behaviour in HerdLink — adding or changing a Kafka topic, writing a producer or consumer, choosing a partition key, designing idempotency, the outbox pattern, DLQs, retries/backoff, sagas, or trace-context propagation across MQTT/Kafka/WebSocket. Triggers on "add a Kafka topic", "consume/produce events", "partition key", "idempotency", "outbox", "dead-letter", "retry", "saga", "exactly-once", "propagate trace context".
---

# Designing event flows in HerdLink

Kafka is the backbone; every cross-service interaction is at-least-once and must be made effectively-once. This skill routes the decision; the **authoritative patterns live in the standards — read them before writing a consumer or producer.**

## Read first (single source of truth)
- [`.cursor/rules/kafka.mdc`](../../../.cursor/rules/kafka.mdc) — client, topics, partitioning, producer/consumer config + code shape, schemas, DLQ.
- [`.cursor/rules/distributed-systems.mdc`](../../../.cursor/rules/distributed-systems.mdc) — idempotency, outbox, sagas, retries, tracing, consistency model.

## Topics (existing platform contract)
| Topic | Purpose | Partitions | Key |
|---|---|---|---|
| `telemetry.raw` | Normalised telemetry from mqtt-bridge | 12 | `device_id` |
| `alerts.breaches` | Geofence breach events | 6 | `device_id` |
| `<topic>.dlq` | Dead-letter per topic | 3 | — |

Naming: `<domain>.<event>` (past tense for events). One topic = one event-schema family.

## Checklist
1. **Idempotency is mandatory** for every consumer — check a Redis key (`SET … NX EX`) *before* any side effect. Telemetry key `deviceId:timestamp`; alerts `deviceId:fenceId:windowBucket`.
2. **Manual offset commits** (`autoCommit: false`) — commit only after successful processing + idempotency record.
3. **Partition key** — choose for ordering + even distribution (`device_id`). Never create hot partitions. Adding partitions rebalances ordering — think before you do. Document a non-obvious choice in an ADR.
4. **Producer config** — `acks: 'all'`, `idempotent: true`, `maxInFlightRequests ≤ 5`, Snappy compression for telemetry; long-lived singleton.
5. **Schemas** — Avro via schema registry, no raw JSON on Kafka; back/forward-compatible evolution; schema-version header.
6. **Atomic write + publish** → use the **outbox pattern** (write domain doc + outbox record in one transaction; separate worker drains to Redis). Never try a dual-write.
7. **Failure handling** — retry only transient errors with exponential backoff + jitter (bounded); persistent failures → `<topic>.dlq` with full error context; DLQ is monitored and replayable.
8. **Tracing** — propagate `traceparent`/`correlationId` in message headers (MQTT in payload metadata); span names are operations (`kafka.consume telemetry.raw`).
9. **Backpressure** — bounded `partitionsConsumedConcurrently` + worker queue; slowing down is correct, crashing is not. Never spawn unbounded promises.

## Refuse
Auto-commit on a consumer with side effects · processing without idempotency · retries without idempotency · dual-writes instead of outbox · swallowing errors (DLQ or rethrow) · synchronous chains of 3+ services on the write path · distributed locks for business logic.
