import mqtt, { type MqttClient } from "mqtt";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";

export interface MqttPublisherOptions {
  brokerUrl: string;
  clientId: string;
  logger: Logger;
  connect?: typeof mqtt.connect;
}

export class MqttPublisher {
  private readonly client: MqttClient;
  private readonly logger: Logger;

  constructor(options: MqttPublisherOptions) {
    this.logger = options.logger;
    const connect = options.connect ?? mqtt.connect;
    this.client = connect(options.brokerUrl, {
      clientId: options.clientId,
    });

    this.client.on("connect", () => this.logger.info("mqtt connected"));
    this.client.on("reconnect", () => this.logger.warn("mqtt reconnecting"));
    this.client.on("close", () => this.logger.warn("mqtt connection closed"));
    this.client.on("error", (error) =>
      this.logger.error({ err: error }, "mqtt error"),
    );
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  publish(message: TelemetryMessage): Promise<void> {
    const topic = `herdlink/telemetry/${message.deviceId}`;
    const payload = JSON.stringify(message);

    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        payload,
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(
              new Error(`Failed to publish telemetry for ${message.deviceId}`, {
                cause: error,
              }),
            );
            return;
          }
          resolve();
        },
      );
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.client.end(false, {}, () => resolve());
    });
  }
}
