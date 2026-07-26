import { seedDevices, seedFences } from './fixtures.ts';
import {
  DeviceStatus,
  type CreateDeviceInput,
  type CreateFenceInput,
  type DashboardStats,
  type Device,
  type Fence,
  type PaginatedResult,
  type PaginationQuery,
  type TimeseriesPoint,
  type UpdateDeviceInput,
  type UpdateFenceInput,
} from './types.ts';

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SWAP POINT.
 *
 * This module is an in-memory fake of the (not-yet-built) dashboard-api. Every
 * function here returns a Promise and simulates latency, so React Query wiring,
 * loading states, optimistic updates and error handling are all exercised for
 * real. When dashboard-api ships, replace the bodies below with `fetch(...)`
 * calls to `/api/v1/...` — the signatures and return types stay identical, so no
 * component or hook needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LATENCY_MS = 350;

// Module-level mutable stores so create/update/delete persist across a session.
let devices: Device[] = seedDevices();
let fences: Fence[] = seedFences();

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function paginate<T>(
  items: T[],
  { page = 1, limit = 20 }: PaginationQuery,
): PaginatedResult<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ── Devices ──────────────────────────────────────────────────────────────── */

export function listDevices(
  query: PaginationQuery = {},
): Promise<PaginatedResult<Device>> {
  const sorted = [...devices].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return delay(paginate(sorted, query));
}

export function createDevice(input: CreateDeviceInput): Promise<Device> {
  const device: Device = {
    id: `dev-${crypto.randomUUID().slice(0, 8)}`,
    serialNumber: input.serialNumber,
    name: input.name,
    type: input.type ?? 'COLLAR_V1',
    status: input.status ?? DeviceStatus.INACTIVE,
    herdId: input.herdId ?? null,
    lastLatitude: null,
    lastLongitude: null,
    lastSeenAt: null,
    batteryLevel: input.batteryLevel ?? null,
    metadata: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  devices = [device, ...devices];
  return delay(device);
}

export function updateDevice(
  id: string,
  input: UpdateDeviceInput,
): Promise<Device> {
  let updated: Device | undefined;
  devices = devices.map((d) => {
    if (d.id !== id) return d;
    updated = { ...d, ...input, updatedAt: nowIso() };
    return updated;
  });
  if (!updated) return Promise.reject(new Error('Device not found'));
  return delay(updated);
}

export function deleteDevice(id: string): Promise<void> {
  devices = devices.filter((d) => d.id !== id);
  return delay(undefined);
}

/* ── Fences ───────────────────────────────────────────────────────────────── */

export function listFences(
  query: PaginationQuery = {},
): Promise<PaginatedResult<Fence>> {
  const sorted = [...fences].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return delay(paginate(sorted, query));
}

export function createFence(input: CreateFenceInput): Promise<Fence> {
  const fence: Fence = {
    id: `fence-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name,
    description: input.description,
    type: input.type,
    breachDirection: input.breachDirection ?? 'BOTH',
    // A placeholder polygon; the real map-draw editor lands with the fences map view.
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-5.1, 56.82],
          [-5.09, 56.82],
          [-5.09, 56.83],
          [-5.1, 56.83],
          [-5.1, 56.82],
        ],
      ],
    },
    active: input.active ?? true,
    herdIds: input.herdIds ?? [],
    alertCooldownSeconds: input.alertCooldownSeconds ?? 300,
    severity: input.severity ?? 'MEDIUM',
    metadata: {},
    createdBy: 'rancher@herdlink.io',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  fences = [fence, ...fences];
  return delay(fence);
}

export function updateFence(
  id: string,
  input: UpdateFenceInput,
): Promise<Fence> {
  let updated: Fence | undefined;
  fences = fences.map((f) => {
    if (f.id !== id) return f;
    updated = { ...f, ...input, updatedAt: nowIso() };
    return updated;
  });
  if (!updated) return Promise.reject(new Error('Fence not found'));
  return delay(updated);
}

export function deleteFence(id: string): Promise<void> {
  fences = fences.filter((f) => f.id !== id);
  return delay(undefined);
}

/* ── Dashboard aggregates ─────────────────────────────────────────────────── */

// Seeded pseudo-random so the trend lines are stable across renders.
function seededTrend(
  days: number,
  base: number,
  spread: number,
): TimeseriesPoint[] {
  const points: TimeseriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const wobble =
      Math.sin(i * 1.3) * spread + Math.cos(i * 0.7) * (spread / 2);
    points.push({
      date: d.toISOString().slice(0, 10),
      value: Math.max(0, Math.round(base + wobble)),
    });
  }
  return points;
}

export function getDashboardStats(): Promise<DashboardStats> {
  const active = devices.filter((d) => d.status === DeviceStatus.ACTIVE);
  const lost = devices.filter((d) => d.status === DeviceStatus.LOST);
  const batteries = devices
    .map((d) => d.batteryLevel)
    .filter((b): b is number => b !== null);
  const avgBattery = batteries.length
    ? Math.round(batteries.reduce((a, b) => a + b, 0) / batteries.length)
    : 0;

  const statusBreakdown = (Object.values(DeviceStatus) as DeviceStatus[]).map(
    (status) => ({
      status,
      count: devices.filter((d) => d.status === status).length,
    }),
  );

  const activeFences = fences.filter((f) => f.active).length;

  const stats: DashboardStats = {
    totalDevices: devices.length,
    activeDevices: active.length,
    activeDevicesDelta: 3,
    lostDevices: lost.length,
    totalFences: fences.length,
    activeFences,
    avgBatteryLevel: avgBattery,
    lowBatteryDevices: batteries.filter((b) => b < 20).length,
    statusBreakdown,
    activeDevicesTrend: seededTrend(14, active.length, 4),
    breachesTrend: seededTrend(14, 5, 4),
  };
  return delay(stats);
}
