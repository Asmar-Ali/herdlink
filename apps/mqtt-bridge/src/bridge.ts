import { TelemetryProducer } from "./kafka/telemetry-producer.js";
import {
  TelemetrySubscriber,
  type TelemetrySubscriberOptions,
} from "./mqtt/telemetry-subscriber.js";

export interface BridgeOptions {
  producer: TelemetryProducer;
  subscriberOptions: Omit<TelemetrySubscriberOptions, "onMessage">;
}

/**
 * Wires the MQTT subscriber's incoming messages straight to the Kafka
 * producer. Healthy only when both sides report connected.
 */
export class Bridge {
  readonly producer: TelemetryProducer;
  readonly subscriber: TelemetrySubscriber;

  constructor(options: BridgeOptions) {
    this.producer = options.producer;
    this.subscriber = new TelemetrySubscriber({
      ...options.subscriberOptions,
      onMessage: (message) => this.producer.publish(message),
    });
  }

  isHealthy(): boolean {
    return this.producer.isConnected() && this.subscriber.isConnected();
  }

  async close(): Promise<void> {
    await this.subscriber.close();
    await this.producer.disconnect();
  }
}
