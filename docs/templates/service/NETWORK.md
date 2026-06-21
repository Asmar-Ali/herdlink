# <service-name> — Network & I/O Contract

> Every byte in and out of this service. This is what you read before wiring it to anything else.
> Standards: [kafka.mdc](../../../.cursor/rules/kafka.mdc), [distributed-systems.mdc](../../../.cursor/rules/distributed-systems.mdc), [database-design.mdc](../../../.cursor/rules/database-design.mdc).

## Listening ports

| Port | Protocol | Purpose |
|---|---|---|
| `<3000>` | HTTP | REST API / health |
| `<…>` | <WS / metrics> | <e.g., Prometheus `/metrics`> |

## Kafka

### Consumes
| Topic | Group ID | Key | Idempotency key | DLQ |
|---|---|---|---|---|
| `<telemetry.raw>` | `<service-name>` | `<device_id>` | `<deviceId:timestamp>` | `<topic>.dlq` |

### Produces
| Topic | Key | Schema | Acks |
|---|---|---|---|
| `<alerts.breaches>` | `<device_id>` | `<avro schema name>` | `all` |

## Datastores

| Store | Access | What | Notes |
|---|---|---|---|
| `<PostgreSQL>` | read/write | `<tables>` | <pool size, statement timeout> |
| `<MongoDB>` | read/write | `<collections>` | <indexes, validators> |
| `<Redis>` | read/write | `<key patterns>` | <TTLs, GEO key> |

## Synchronous calls (outbound)

| Target service | Protocol | When | Circuit breaker | Failure behaviour |
|---|---|---|---|---|
| `<device-service>` | REST/GraphQL | <when staleness unacceptable> | <yes/no> | <fallback> |

## MQTT

> Only for edge/bridge services. Otherwise delete.

- **Broker:** Mosquitto · **Topics:** `<pattern>` · **QoS:** `<0|1|2>` · **Last-will:** <yes/no>

## Observability emitted

- **Logs:** Pino JSON with `correlationId`, `traceId`.
- **Metrics:** RED + `<domain metrics: consumer lag, outbox pending, WS clients…>`.
- **Traces:** spans named `<operation>` (e.g., `kafka.consume telemetry.raw`), context propagated via `traceparent`.
