# HerdLink — local infrastructure

The Docker Compose stack that backs the HerdLink platform. Run this once and
every database, broker, and observability tool you need is alive on your
laptop.

## Repository layout (relevant parts)

```
docker-compose.yml
infra/
├── mosquitto/
│   └── mosquitto.conf
├── prometheus/
│   └── prometheus.yml
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── datasources.yml
└── jaeger/
    └── config.yaml
```

## Quickstart

```bash
docker compose up -d
docker compose ps
```

Wait ~30 seconds. The healthchecks need a moment to settle.

## What runs

| Service           | Host port  | Purpose                                      |
|-------------------|-----------:|----------------------------------------------|
| TimescaleDB       | 5432       | Postgres + time-series. Devices, telemetry.  |
| MongoDB           | 27017      | Geofences, alerts                            |
| Redis             | 6379       | GEO, idempotency, pub/sub                    |
| Kafka             | 9092       | Event backbone (KRaft, no Zookeeper)         |
| Schema Registry   | 8081       | Avro schemas                                 |
| Mosquitto         | 1883, 9001 | MQTT broker (TCP + WebSockets)               |
| Prometheus        | 9090       | Metrics                                      |
| Grafana           | 3001       | Dashboards (admin / admin)                   |
| Jaeger            | 16686      | Distributed traces UI                        |
| Jaeger OTLP       | 4317, 4318 | Trace ingestion (gRPC + HTTP)                |
| Kafka UI          | 8080       | Topic browser                                |
| mongo-express     | 8082       | MongoDB browser                              |
| pgAdmin           | 8083       | PostgreSQL browser (dev@herdlink.local)      |

## Connection strings (for app services)

When apps run **on your host** (e.g. NestJS via `nest start`):

```
DATABASE_URL=postgres://herdlink:herdlink_dev@localhost:5432/herdlink
MONGO_URL=mongodb://herdlink:herdlink_dev@localhost:27017/herdlink?authSource=admin
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
MQTT_URL=mqtt://localhost:1883
SCHEMA_REGISTRY_URL=http://localhost:8081
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

When apps run **inside Docker** (later, when we add app services to compose),
swap `localhost` for the service name:

```
DATABASE_URL=postgres://herdlink:herdlink_dev@timescaledb:5432/herdlink
KAFKA_BROKERS=kafka:29092          # note the internal port, 29092 not 9092
```

## Common operations

```bash
# Tail one service's logs
docker compose logs -f kafka

# Restart one service
docker compose restart redis

# Open a psql shell against TimescaleDB
docker compose exec timescaledb psql -U herdlink -d herdlink

# Open a mongosh shell
docker compose exec mongodb mongosh -u herdlink -p herdlink_dev --authenticationDatabase admin

# Open a redis-cli shell
docker compose exec redis redis-cli

# Stop everything, KEEP data
docker compose down

# Stop everything, WIPE data (clean slate)
docker compose down -v
```

## Troubleshooting

**Kafka won't become healthy.** First start can take 30–60 seconds. If it
still fails, check `docker compose logs kafka` for the line
`[KafkaServer id=1] started`. If you see `cluster.id` errors, the most
likely cause is stale data — `docker compose down -v` and try again.

**Schema Registry keeps restarting.** It depends on Kafka being healthy.
The compose file handles this with `depends_on: condition: service_healthy`,
but if Kafka is slow on first boot, Schema Registry may still time out and
retry. It usually settles within two minutes.

**Port conflicts.** If you have a local Postgres or Redis already running,
the corresponding container will fail with a bind error. Either stop your
local service or change the host port mapping in `docker-compose.yml`.

**Apple Silicon (M-series).** All images used here have arm64 builds.
Should "just work."

## Why these specific versions

Every image is pinned to a specific major (TimescaleDB on Postgres 18,
MongoDB 8, Redis 8, Kafka 8.2, Mosquitto 2.1, Jaeger 2.17). Pinning means
the project still works the same way six months from now. Dev UIs use
`:latest` — they're disposable and don't affect application behaviour.
