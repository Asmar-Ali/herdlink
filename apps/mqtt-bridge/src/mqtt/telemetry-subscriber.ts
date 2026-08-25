import mqtt, { type MqttClient } from "mqtt";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";

export type TelemetryHandler = (
  message: TelemetryMessage,
) => void | Promise<void>;

export interface TelemetrySubscriberOptions {
  brokerUrl: string;
  clientId: string;
  topic: string;
  logger: Logger;
  onMessage: TelemetryHandler;
  connect?: typeof mqtt.connect;
}

function isTelemetryMessage(value: unknown): value is TelemetryMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const position = candidate.position as Record<string, unknown> | undefined;

  return (
    typeof candidate.deviceId === "string" &&
    typeof candidate.herdId === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.batteryLevel === "number" &&
    typeof candidate.sequence === "number" &&
    typeof candidate.correlationId === "string" &&
    typeof position === "object" &&
    position !== null &&
    typeof position.lat === "number" &&
    typeof position.lng === "number"
  );
}

/**
 * Subscribes to device-simulator's MQTT telemetry and forwards parsed,
 * shape-valid messages to `onMessage`. Malformed payloads (not JSON, or JSON
 * that doesn't match TelemetryMessage) are logged and dropped, not forwarded —
 * this is mqtt-bridge's "normalisation" for M1, see BUILD_PLAN.md.
 */
export class TelemetrySubscriber {
  private readonly client: MqttClient;
  private readonly logger: Logger;
  private readonly onMessage: TelemetryHandler;

  constructor(options: TelemetrySubscriberOptions) {
    this.logger = options.logger;
    this.onMessage = options.onMessage;
    const connect = options.connect ?? mqtt.connect;
    this.client = connect(options.brokerUrl, { clientId: options.clientId });

    this.client.on("connect", () => {
      this.logger.info("mqtt connected");
      this.client.subscribe(options.topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error({ err: error }, "mqtt subscribe failed");
        }
      });
    });
    this.client.on("reconnect", () => this.logger.warn("mqtt reconnecting"));
    this.client.on("close", () => this.logger.warn("mqtt connection closed"));
    this.client.on("error", (error) =>
      this.logger.error({ err: error }, "mqtt error"),
    );
    this.client.on("message", (_topic, payload) => {
      void this.handleMessage(payload);
    });
  }

  private async handleMessage(payload: Buffer): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.toString());
    } catch (error) {
      this.logger.error(
        { err: error },
        "dropping malformed telemetry payload: not valid JSON",
      );
      return;
    }

    if (!isTelemetryMessage(parsed)) {
      this.logger.error(
        { payload: parsed },
        "dropping malformed telemetry payload: does not match TelemetryMessage",
      );
      return;
    }

    try {
      await this.onMessage(parsed);
    } catch (error) {
      this.logger.error(
        { err: error, deviceId: parsed.deviceId },
        "telemetry handler failed",
      );
    }
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.client.end(false, {}, () => resolve());
    });
  }
}
