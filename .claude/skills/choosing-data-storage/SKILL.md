---
name: choosing-data-storage
description: Use when deciding where data should live in HerdLink — picking between TimescaleDB, MongoDB, Redis, or PostgreSQL, defining table/collection/key schemas, identifiers, indexes, retention, or data ownership boundaries. Triggers on "where should this data live", "which database", "add a table/collection", "model this entity", "store the telemetry/fences/alerts/positions", "schema design", "retention/TTL".
---

# Choosing data storage in HerdLink

HerdLink is **polyglot by design** — each store does a workload it's genuinely good at. This skill is the decision routing; the **authoritative modeling rules live in the standards — read them before designing a schema.**

## Read first (single source of truth)
- [`.cursor/rules/database-design.mdc`](../../../.cursor/rules/database-design.mdc) — store boundaries, ownership, IDs, modeling, evolution, retention, indexes.
- [`.cursor/rules/sql.mdc`](../../../.cursor/rules/sql.mdc) — Postgres/TimescaleDB specifics, hypertables, repos, query patterns.

## The decision (don't mix workloads)
| If the data is… | Use | Because |
|---|---|---|
| Time-ordered, append-heavy, queried by time range (telemetry) | **TimescaleDB** | Hypertables, compression, `time_bucket` aggregations |
| Variable-shape documents / GeoJSON (fences, alerts, device configs) | **MongoDB** | Schema flexibility + native geospatial |
| Hot ephemeral state (live positions, idempotency keys, pub/sub) | **Redis** | Sub-ms reads, TTLs, GEO, pub/sub |
| Relational records with FKs/transactions (devices) | **PostgreSQL** | Referential integrity |

**Hard rules:** never put telemetry in Mongo; never put fences in Postgres; never make Redis a source of truth for anything that can't be regenerated.

## Checklist
1. **Match the workload** to the table above. If it spans two, you likely have two concerns — split them.
2. **Ownership** — the service that writes it owns it. No other service reads its DB directly; exchange via Kafka (preferred) or sync API.
3. **Identifiers** — UUIDs (v7 preferred), one canonical ID, never expose sequence IDs; composite keys only where natural (e.g., telemetry `(device_id, ts)`).
4. **Retention** — every entity gets a documented retention/TTL (telemetry 90d, alerts 1y, outbox 7d, idempotency 24h). No unbounded growth.
5. **Indexes** — index the queries you actually run; 2dsphere on fence geometry; partial indexes for sparse predicates.
6. **Evolution** — forward-only Postgres migrations; additive Mongo changes with updated validators; Avro back/forward-compatible for Kafka.
7. **Record the choice** — a non-obvious storage/denormalisation decision gets an ADR (`/new-adr`).

## Refuse
Cross-service JOINs · FKs across service boundaries · the same entity authoritative in two places · Mongo as a relational store (`$lookup` everywhere) · "we'll add the index later" on a per-request query.
