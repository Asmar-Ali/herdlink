import { CompressionTypes, Kafka, type Producer } from "kafkajs";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";

const TOPIC = "telemetry.raw";
const ACKS_ALL = -1;

export interface TelemetryProducerOptions {
  brokers: string[];
  clientId: string;
  logger: Logger;
  kafka?: Kafka;
}

/**
 * Long-lived singleton per kafka.mdc: construct once, connect() on startup,
 * disconnect() on shutdown. Idempotent producer guards against duplicate
 * *retries*; duplicate *inputs* (from MQTT QoS 1 redelivery) are a consumer-side
 * concern handled downstream, not here — see BUILD_PLAN.md.
 */
export class TelemetryProducer {
  private readonly producer: Producer;
  private readonly logger: Logger;
  private connected = false;

  constructor(options: TelemetryProducerOptions) {
    this.logger = options.logger;
    const kafka =
      options.kafka ??
      new Kafka({ clientId: options.clientId, brokers: options.brokers });

    this.producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
    });

    this.producer.on(this.producer.events.CONNECT, () => {
      this.connected = true;
      this.logger.info("kafka producer connected");
    });
    this.producer.on(this.producer.events.DISCONNECT, () => {
      this.connected = false;
      this.logger.warn("kafka producer disconnected");
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish(message: TelemetryMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: TOPIC,
        acks: ACKS_ALL,
        compression: CompressionTypes.Snappy,
        messages: [
          {
            key: message.deviceId,
            value: JSON.stringify(message),
            headers: {
              correlationId: message.correlationId,
              "schema-version": "1",
            },
            timestamp: String(Date.now()),
          },
        ],
      });
    } catch (error) {
      throw new Error(`Failed to publish telemetry for ${message.deviceId}`, {
        cause: error,
      });
    }
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
