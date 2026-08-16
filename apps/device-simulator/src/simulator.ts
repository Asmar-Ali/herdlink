import { ulid } from "ulid";
import type { Logger } from "@herdlink/observability";
import { nextPosition } from "./telemetry/gps-walk.js";
import { nextBatteryLevel } from "./telemetry/battery.js";
import type {
  Position,
  TelemetryMessage,
} from "./telemetry/telemetry-message.js";
import type { MqttPublisher } from "./mqtt/mqtt-publisher.js";

export interface SimulatorOptions {
  deviceId: string;
  herdId: string;
  startPosition: Position;
  stepDegrees: number;
  intervalMs: number;
  publisher: MqttPublisher;
  logger: Logger;
}

/**
 * Recursive setTimeout tick loop: the next tick is only scheduled once the
 * current one finishes, so a slow publish can't cause overlapping ticks.
 */
export class Simulator {
  private position: Position;
  private batteryLevel = 100;
  private sequence = 0;
  private timer: NodeJS.Timeout | undefined;
  private stopped = true;

  constructor(private readonly options: SimulatorOptions) {
    this.position = options.startPosition;
  }

  start(): void {
    this.stopped = false;
    void this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    this.position = nextPosition(this.position, this.options.stepDegrees);
    this.batteryLevel = nextBatteryLevel(this.batteryLevel);
    this.sequence += 1;

    const message: TelemetryMessage = {
      deviceId: this.options.deviceId,
      herdId: this.options.herdId,
      timestamp: new Date().toISOString(),
      position: this.position,
      batteryLevel: Math.round(this.batteryLevel),
      sequence: this.sequence,
      correlationId: ulid(),
    };

    try {
      await this.options.publisher.publish(message);
      this.options.logger.info({ message }, "telemetry published");
    } catch (error) {
      this.options.logger.error({ err: error }, "telemetry publish failed");
    }

    if (!this.stopped) {
      this.timer = setTimeout(() => {
        void this.tick();
      }, this.options.intervalMs);
    }
  }
}
