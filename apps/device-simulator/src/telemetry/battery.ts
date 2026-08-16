import type { RandomFn } from "./gps-walk.js";

const MIN_DRAIN_PER_TICK = 0.05;
const MAX_DRAIN_PER_TICK = 0.2;
const DEFAULT_MIN_LEVEL = 1;

/**
 * Gradual drain with jitter. Floors at `minLevel` — no LOST-status transition here,
 * that belongs to device-service/ingestion once this telemetry lands somewhere.
 */
export function nextBatteryLevel(
  current: number,
  rng: RandomFn = Math.random,
  minLevel: number = DEFAULT_MIN_LEVEL,
): number {
  const drain =
    MIN_DRAIN_PER_TICK + rng() * (MAX_DRAIN_PER_TICK - MIN_DRAIN_PER_TICK);

  return Math.max(minLevel, current - drain);
}
