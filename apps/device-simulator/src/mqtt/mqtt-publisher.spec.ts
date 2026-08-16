import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import type { Logger } from "@herdlink/observability";
import { MqttPublisher } from "./mqtt-publisher.js";
import type { TelemetryMessage } from "../telemetry/telemetry-message.js";

type PublishCallback = (error?: Error) => void;
type EndCallback = () => void;

class FakeMqttClient extends EventEmitter {
  connected = false;
  publishCalls: Array<{
    topic: string;
    payload: string;
    options: { qos: number; retain: boolean };
  }> = [];
  endCalls = 0;
  private nextPublishError: Error | undefined;

  failNextPublish(error: Error): void {
    this.nextPublishError = error;
  }

  publish(
    topic: string,
    payload: string,
    options: { qos: number; retain: boolean },
    callback: PublishCallback,
  ): void {
    this.publishCalls.push({ topic, payload, options });
    const error = this.nextPublishError;
    this.nextPublishError = undefined;
    callback(error);
  }

  end(_force: boolean, _options: unknown, callback: EndCallback): void {
    this.endCalls += 1;
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

describe("MqttPublisher", () => {
  it("connects using the given broker URL and client ID", () => {
    const client = new FakeMqttClient();
    const connect = jest.fn(
      (_url: string, _options: { clientId: string }) => client,
    );

    new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger: createLogger(),
      connect: connect as never,
    });

    expect(connect).toHaveBeenCalledWith("mqtt://localhost:1883", {
      clientId: "device-simulator-SIM-000001",
    });
  });

  it("logs on connect, reconnect, close, and error events", () => {
    const client = new FakeMqttClient();
    const logger = createLogger();

    new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger,
      connect: (() => client) as never,
    });

    client.emit("connect");
    client.emit("reconnect");
    client.emit("close");
    client.emit("error", new Error("boom"));

    expect(logger.info).toHaveBeenCalledWith("mqtt connected");
    expect(logger.warn).toHaveBeenCalledWith("mqtt reconnecting");
    expect(logger.warn).toHaveBeenCalledWith("mqtt connection closed");
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "mqtt error",
    );
  });

  it("publishes to herdlink/telemetry/<deviceId> with QoS 1 and retain false", async () => {
    const client = new FakeMqttClient();
    const publisher = new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger: createLogger(),
      connect: (() => client) as never,
    });

    const message = createMessage();
    await publisher.publish(message);

    expect(client.publishCalls).toHaveLength(1);
    expect(client.publishCalls[0]).toEqual({
      topic: "herdlink/telemetry/SIM-000001",
      payload: JSON.stringify(message),
      options: { qos: 1, retain: false },
    });
  });

  it("rejects with a wrapped error when the underlying publish fails", async () => {
    const client = new FakeMqttClient();
    const publisher = new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger: createLogger(),
      connect: (() => client) as never,
    });

    const cause = new Error("broker unreachable");
    client.failNextPublish(cause);

    await expect(publisher.publish(createMessage())).rejects.toMatchObject({
      message: "Failed to publish telemetry for SIM-000001",
      cause,
    });
  });

  it("reflects the underlying client connection state", () => {
    const client = new FakeMqttClient();
    const publisher = new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger: createLogger(),
      connect: (() => client) as never,
    });

    expect(publisher.isConnected()).toBe(false);
    client.connected = true;
    expect(publisher.isConnected()).toBe(true);
  });

  it("closes the underlying client", async () => {
    const client = new FakeMqttClient();
    const publisher = new MqttPublisher({
      brokerUrl: "mqtt://localhost:1883",
      clientId: "device-simulator-SIM-000001",
      logger: createLogger(),
      connect: (() => client) as never,
    });

    await publisher.close();

    expect(client.endCalls).toBe(1);
  });
});
