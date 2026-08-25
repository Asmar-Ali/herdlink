import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import type { Logger } from "@herdlink/observability";
import type { TelemetryMessage } from "@herdlink/contracts";
import {
  TelemetrySubscriber,
  type TelemetryHandler,
} from "./telemetry-subscriber.js";

type SubscribeCallback = (error?: Error) => void;

class FakeMqttClient extends EventEmitter {
  connected = false;
  subscribeCalls: Array<{ topic: string; options: { qos: number } }> = [];

  subscribe(
    topic: string,
    options: { qos: number },
    callback: SubscribeCallback,
  ): void {
    this.subscribeCalls.push({ topic, options });
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

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("TelemetrySubscriber", () => {
  it("subscribes to the given topic at QoS 1 on connect", () => {
    const client = new FakeMqttClient();

    new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger: createLogger(),
      onMessage: jest.fn<TelemetryHandler>(),
      connect: (() => client) as never,
    });

    client.emit("connect");

    expect(client.subscribeCalls).toEqual([
      { topic: "herdlink/telemetry/#", options: { qos: 1 } },
    ]);
  });

  it("forwards a well-formed telemetry message to onMessage", async () => {
    const client = new FakeMqttClient();
    const onMessage = jest.fn<TelemetryHandler>();

    new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger: createLogger(),
      onMessage,
      connect: (() => client) as never,
    });

    const message = createMessage();
    client.emit(
      "message",
      "herdlink/telemetry/SIM-000001",
      Buffer.from(JSON.stringify(message)),
    );
    await flushMicrotasks();

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("drops and logs a payload that is not valid JSON", async () => {
    const client = new FakeMqttClient();
    const logger = createLogger();
    const onMessage = jest.fn<TelemetryHandler>();

    new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger,
      onMessage,
      connect: (() => client) as never,
    });

    client.emit("message", "herdlink/telemetry/x", Buffer.from("not json"));
    await flushMicrotasks();

    expect(onMessage).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "dropping malformed telemetry payload: not valid JSON",
    );
  });

  it("drops and logs valid JSON that does not match TelemetryMessage", async () => {
    const client = new FakeMqttClient();
    const logger = createLogger();
    const onMessage = jest.fn<TelemetryHandler>();

    new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger,
      onMessage,
      connect: (() => client) as never,
    });

    client.emit(
      "message",
      "herdlink/telemetry/x",
      Buffer.from(JSON.stringify({ foo: "bar" })),
    );
    await flushMicrotasks();

    expect(onMessage).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { foo: "bar" } }),
      "dropping malformed telemetry payload: does not match TelemetryMessage",
    );
  });

  it("logs but does not throw when the handler rejects", async () => {
    const client = new FakeMqttClient();
    const logger = createLogger();
    const onMessage = jest.fn<TelemetryHandler>(() =>
      Promise.reject(new Error("kafka down")),
    );

    new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger,
      onMessage,
      connect: (() => client) as never,
    });

    const message = createMessage();
    client.emit(
      "message",
      "herdlink/telemetry/SIM-000001",
      Buffer.from(JSON.stringify(message)),
    );
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        deviceId: "SIM-000001",
      }),
      "telemetry handler failed",
    );
  });

  it("reflects connection state", () => {
    const client = new FakeMqttClient();
    const subscriber = new TelemetrySubscriber({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "mqtt-bridge",
      topic: "herdlink/telemetry/#",
      logger: createLogger(),
      onMessage: jest.fn<TelemetryHandler>(),
      connect: (() => client) as never,
    });

    expect(subscriber.isConnected()).toBe(false);
    client.connected = true;
    expect(subscriber.isConnected()).toBe(true);
  });
});
