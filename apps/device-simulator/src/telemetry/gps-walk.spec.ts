import { describe, expect, it } from "@jest/globals";
import { nextPosition, type RandomFn } from "./gps-walk.js";

function sequence(values: number[]): RandomFn {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value as number;
  };
}

describe("nextPosition", () => {
  it("does not move when the sampled magnitude is zero", () => {
    const current = { lat: -37.796, lng: 144.904 };

    const next = nextPosition(current, 0.0001, sequence([0, 0]));

    expect(next).toEqual(current);
  });

  it("moves due east by exactly stepDegrees at angle 0, magnitude 1", () => {
    const current = { lat: -37.796, lng: 144.904 };
    const stepDegrees = 0.0001;

    const next = nextPosition(current, stepDegrees, sequence([0, 1]));

    expect(next.lat).toBeCloseTo(current.lat, 10);
    expect(next.lng).toBeCloseTo(current.lng + stepDegrees, 10);
  });

  it("never steps further than stepDegrees from the current position", () => {
    const current = { lat: -37.796, lng: 144.904 };
    const stepDegrees = 0.0005;

    for (let i = 0; i < 200; i += 1) {
      const next = nextPosition(current, stepDegrees, Math.random);
      const distance = Math.hypot(
        next.lat - current.lat,
        next.lng - current.lng,
      );

      expect(distance).toBeLessThanOrEqual(stepDegrees + 1e-12);
    }
  });
});
