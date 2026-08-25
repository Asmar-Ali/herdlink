import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";
import { TelemetryProducer } from "./telemetry-producer.js";

const EVENTS = {
  CONNECT: "producer.connect",
  DISCONNECT: "producer.disconnect",
};

class FakeProducer extends EventEmitter {
  readonly events = EVENTS;
  connectCalls = 0;
  disconnectCalls = 0;
  sendCalls: Array<Record<string, unknown>> = [];
  private nextSendError: Error | undefined;

  failNextSend(error: Error): void {
    this.nextSendError = error;
  }

  connect(): Promise<void> {
    this.connectCalls += 1;
    this.emit(EVENTS.CONNECT);
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.disconnectCalls += 1;
    this.emit(EVENTS.DISCONNECT);
    return Promise.resolve();
  }

  send(record: Record<string, unknown>): Promise<void> {
    this.sendCalls.push(record);
    if (this.nextSendError) {
      const error = this.nextSendError;
      this.nextSendError = undefined;
      return Promise.reject(error);
    }
    return Promise.resolve();
  }
}

class FakeKafka {
  readonly producerInstance = new FakeProducer();
  producerConfig: unknown;

  producer(config: unknown): FakeProducer {
    this.producerConfig = config;
    return this.producerInstance;
  }
}

function createLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  } as unknown as Logger;
}

function createMessage(
  overrides: Partial<TelemetryMessage> = {},
): TelemetryMessage {
  return {
    deviceId: "SIM-000001",
    herdId: "herd-demo-1",
    timestamp: "2026-01-01T00:00:00.000Z",
    position: { lat: -37.796, lng: 144.904 },
    batteryLevel: 100,
    sequence: 1,
    correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ...overrides,
  };
}

describe("TelemetryProducer", () => {
  it("constructs the underlying producer with idempotent config", () => {
    const kafka = new FakeKafka();

    new TelemetryProducer({
      brokers: ["localhost:9092"],
      clientId: "mqtt-bridge",
      logger: createLogger(),
      kafka: kafka as never,
    });

    expect(kafka.producerConfig).toEqual({
      idempotent: true,
      maxInFlightRequests: 5,
    });
  });

  it("reflects connected state via producer events", async () => {
    const kafka = new FakeKafka();
    const producer = new TelemetryProducer({
      brokers: ["localhost:9092"],
      clientId: "mqtt-bridge",
      logger: createLogger(),
      kafka: kafka as never,
    });

    expect(producer.isConnected()).toBe(false);
    await producer.connect();
    expect(producer.isConnected()).toBe(true);

    await producer.disconnect();
    expect(producer.isConnected()).toBe(false);
  });

  it("publishes to telemetry.raw keyed by deviceId with acks all and headers", async () => {
    const kafka = new FakeKafka();
    const producer = new TelemetryProducer({
      brokers: ["localhost:9092"],
      clientId: "mqtt-bridge",
      logger: createLogger(),
      kafka: kafka as never,
    });

    const message = createMessage();
    await producer.publish(message);

    expect(kafka.producerInstance.sendCalls).toHaveLength(1);
    const [record] = kafka.producerInstance.sendCalls;
    expect(record).toMatchObject({
      topic: "telemetry.raw",
      acks: -1,
    });
    const messages = record?.messages as Array<Record<string, unknown>>;
    expect(messages[0]).toMatchObject({
      key: "SIM-000001",
      value: JSON.stringify(message),
      headers: {
        correlationId: message.correlationId,
        "schema-version": "1",
      },
    });
  });

  it("wraps send failures with a descriptive error", async () => {
    const kafka = new FakeKafka();
    const producer = new TelemetryProducer({
      brokers: ["localhost:9092"],
      clientId: "mqtt-bridge",
      logger: createLogger(),
      kafka: kafka as never,
    });

    const cause = new Error("broker unavailable");
    kafka.producerInstance.failNextSend(cause);

    await expect(producer.publish(createMessage())).rejects.toMatchObject({
      message: "Failed to publish telemetry for SIM-000001",
      cause,
    });
  });
});
