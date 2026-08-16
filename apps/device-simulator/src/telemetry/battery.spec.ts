import { describe, expect, it } from "@jest/globals";
import { nextBatteryLevel } from "./battery.js";

describe("nextBatteryLevel", () => {
  it("drains by the minimum jitter amount when rng returns 0", () => {
    expect(nextBatteryLevel(50, () => 0)).toBeCloseTo(49.95, 10);
  });

  it("drains by the maximum jitter amount when rng returns 1", () => {
    expect(nextBatteryLevel(50, () => 1)).toBeCloseTo(49.8, 10);
  });

  it("floors at the default minimum level (1) instead of going negative", () => {
    expect(nextBatteryLevel(1, () => 1)).toBe(1);
    expect(nextBatteryLevel(1.1, () => 1)).toBe(1);
  });

  it("floors at a configurable minimum level", () => {
    expect(nextBatteryLevel(10, () => 1, 9.9)).toBe(9.9);
  });

  it("never increases", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(nextBatteryLevel(50, Math.random)).toBeLessThanOrEqual(50);
    }
  });
});
