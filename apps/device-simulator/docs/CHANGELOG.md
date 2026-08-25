# device-simulator — Changelog

> Per-service change history. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
> Update under `[Unreleased]` in the same change as the code. Categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added
- Initial implementation: publishes one simulated collar's telemetry (`herdlink/telemetry/<deviceId>`) over MQTT every 30s — bounded random-walk position, jittered battery drain, `TelemetryMessage` envelope with ULID `correlationId`.
- `GET /health` liveness endpoint (200 while MQTT connected, 503 otherwise).
- Unit tests for `nextPosition`, `nextBatteryLevel`, `MqttPublisher`, and `Simulator`.
- Docker Compose wiring — `device-simulator` service, Mosquitto uncommented and brought online as a dependency.

### Changed
- `TelemetryMessage`/`Position` moved out of this service and into `@herdlink/contracts`, now that `mqtt-bridge` needs to share the same shape. No behavior change — same wire format.
