import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Logger } from "@herdlink/observability";
import { Simulator } from "./simulator.js";
import type { MqttPublisher } from "./mqtt/mqtt-publisher.js";
import type { TelemetryMessage } from "./telemetry/telemetry-message.js";

function createLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  } as unknown as Logger;
}

function createPublisher(): jest.Mocked<Pick<MqttPublisher, "publish">> {
  return { publish: jest.fn(() => Promise.resolve(undefined)) };
}

describe("Simulator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("publishes immediately on start with sequence 1", async () => {
    const publisher = createPublisher();
    const simulator = new Simulator({
      deviceId: "SIM-000001",
      herdId: "herd-demo-1",
      startPosition: { lat: -37.796, lng: 144.904 },
      stepDegrees: 0.0001,
      intervalMs: 30_000,
      publisher: publisher as unknown as MqttPublisher,
      logger: createLogger(),
    });

    simulator.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const message = publisher.publish.mock.calls[0]?.[0] as TelemetryMessage;
    expect(message.deviceId).toBe("SIM-000001");
    expect(message.herdId).toBe("herd-demo-1");
    expect(message.sequence).toBe(1);
    expect(message.batteryLevel).toBeLessThanOrEqual(100);
    expect(message.batteryLevel).toBeGreaterThanOrEqual(1);

    simulator.stop();
  });

  it("ticks again after intervalMs, incrementing the sequence", async () => {
    const publisher = createPublisher();
    const simulator = new Simulator({
      deviceId: "SIM-000001",
      herdId: "herd-demo-1",
      startPosition: { lat: -37.796, lng: 144.904 },
      stepDegrees: 0.0001,
      intervalMs: 30_000,
      publisher: publisher as unknown as MqttPublisher,
      logger: createLogger(),
    });

    simulator.start();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);

    expect(publisher.publish).toHaveBeenCalledTimes(3);
    const sequences = publisher.publish.mock.calls.map(
      ([message]) => message.sequence,
    );
    expect(sequences).toEqual([1, 2, 3]);

    simulator.stop();
  });

  it("stops scheduling further ticks after stop()", async () => {
    const publisher = createPublisher();
    const simulator = new Simulator({
      deviceId: "SIM-000001",
      herdId: "herd-demo-1",
      startPosition: { lat: -37.796, lng: 144.904 },
      stepDegrees: 0.0001,
      intervalMs: 30_000,
      publisher: publisher as unknown as MqttPublisher,
      logger: createLogger(),
    });

    simulator.start();
    await jest.advanceTimersByTimeAsync(0);
    simulator.stop();
    await jest.advanceTimersByTimeAsync(120_000);

    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it("logs and keeps ticking when a publish fails", async () => {
    const logger = createLogger();
    const publisher = createPublisher();
    publisher.publish
      .mockRejectedValueOnce(new Error("broker unreachable"))
      .mockResolvedValue(undefined);

    const simulator = new Simulator({
      deviceId: "SIM-000001",
      herdId: "herd-demo-1",
      startPosition: { lat: -37.796, lng: 144.904 },
      stepDegrees: 0.0001,
      intervalMs: 30_000,
      publisher: publisher as unknown as MqttPublisher,
      logger,
    });

    simulator.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "telemetry publish failed",
    );

    await jest.advanceTimersByTimeAsync(30_000);

    expect(publisher.publish).toHaveBeenCalledTimes(2);

    simulator.stop();
  });
});
