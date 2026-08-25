import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";
import { Bridge } from "./bridge.js";
import type { TelemetryProducer } from "./kafka/telemetry-producer.js";

class FakeMqttClient extends EventEmitter {
  connected = false;

  subscribe(
    _topic: string,
    _options: { qos: number },
    callback: (error?: Error) => void,
  ): void {
    callback();
  }

  end(_force: boolean, _options: unknown, callback: () => void): void {
    callback();
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

function createMessage(): TelemetryMessage {
  return {
    deviceId: "SIM-000001",
    herdId: "herd-demo-1",
    timestamp: "2026-01-01T00:00:00.000Z",
    position: { lat: -37.796, lng: 144.904 },
    batteryLevel: 100,
    sequence: 1,
    correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function createFakeProducer(): jest.Mocked<
  Pick<TelemetryProducer, "publish" | "isConnected">
> {
  return {
    publish: jest.fn(() => Promise.resolve(undefined)),
    isConnected: jest.fn(() => true),
  };
}

describe("Bridge", () => {
  it("publishes exactly once for each subscribed message", async () => {
    const client = new FakeMqttClient();
    const producer = createFakeProducer();

    new Bridge({
      producer: producer as unknown as TelemetryProducer,
      subscriberOptions: {
        brokerUrl: "mqtt://localhost:1883",
        clientId: "mqtt-bridge",
        topic: "herdlink/telemetry/#",
        logger: createLogger(),
        connect: (() => client) as never,
      },
    });

    const message = createMessage();
    client.emit(
      "message",
      "herdlink/telemetry/SIM-000001",
      Buffer.from(JSON.stringify(message)),
    );
    await flushMicrotasks();

    expect(producer.publish).toHaveBeenCalledTimes(1);
    expect(producer.publish).toHaveBeenCalledWith(message);
  });

  it("is healthy only when both producer and subscriber are connected", () => {
    const client = new FakeMqttClient();
    const producer = createFakeProducer();
    producer.isConnected.mockReturnValue(false);

    const bridge = new Bridge({
      producer: producer as unknown as TelemetryProducer,
      subscriberOptions: {
        brokerUrl: "mqtt://localhost:1883",
        clientId: "mqtt-bridge",
        topic: "herdlink/telemetry/#",
        logger: createLogger(),
        connect: (() => client) as never,
      },
    });

    expect(bridge.isHealthy()).toBe(false);

    producer.isConnected.mockReturnValue(true);
    expect(bridge.isHealthy()).toBe(false);

    client.connected = true;
    expect(bridge.isHealthy()).toBe(true);
  });
});
