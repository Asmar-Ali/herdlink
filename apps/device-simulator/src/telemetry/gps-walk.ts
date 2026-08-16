import type { Position } from "./telemetry-message.js";

export type RandomFn = () => number;

/**
 * One bounded random-walk step: a random direction, magnitude up to `stepDegrees`.
 */
export function nextPosition(
  current: Position,
  stepDegrees: number,
  rng: RandomFn = Math.random,
): Position {
  const angle = rng() * 2 * Math.PI;
  const magnitude = rng() * stepDegrees;

  return {
    lat: current.lat + Math.sin(angle) * magnitude,
    lng: current.lng + Math.cos(angle) * magnitude,
  };
}
