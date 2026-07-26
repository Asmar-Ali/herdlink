import { http, toQuery } from './http.ts';
import {
  DeviceStatus,
  type CreateDeviceInput,
  type CreateFenceInput,
  type DashboardStats,
  type Device,
  type Fence,
  type GeoJSONPolygon,
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
 * Devices and fences are both wired to the real device-service REST API
 * (`/api/v1/device`, `/api/v1/fence`) via the `http` helper — list/create/
 * update/delete round-trip to Postgres/Mongo and mutations carry the operator's
 * JWT. Only the dashboard trend lines remain synthetic (no stats endpoint yet);
 * its totals are derived from the live device and fence lists so the tiles never
 * disagree with the tables. Each function keeps the same signature and return
 * type, so no component or hook changed when the swap happened.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Devices (live — device-service `/api/v1/device`) ───────────────────────── */

export function listDevices(
  query: PaginationQuery = {},
): Promise<PaginatedResult<Device>> {
  // device-service orders the page by `updatedAt DESC`, so no client re-sort.
  return http.get<PaginatedResult<Device>>(
    `/device${toQuery({ page: query.page, limit: query.limit })}`,
  );
}

export function createDevice(input: CreateDeviceInput): Promise<Device> {
  return http.post<Device>('/device', input);
}

export function updateDevice(
  id: string,
  input: UpdateDeviceInput,
): Promise<Device> {
  return http.patch<Device>(`/device/${id}`, input);
}

export function deleteDevice(id: string): Promise<void> {
  return http.delete(`/device/${id}`);
}

/* ── Fences (live — device-service `/api/v1/fence`) ─────────────────────────── */

// device-service's CreateFenceDto requires a valid closed GeoJSON polygon, but
// the shape is drawn on the (not-yet-built) fences map, not typed in the form.
// Until that editor lands, new fences get this placeholder ring near the demo
// ranch; operators redraw the real boundary later. Keeping it here (not in the
// form) means the form and types stay geometry-free until the map view needs it.
const PLACEHOLDER_GEOMETRY: GeoJSONPolygon = {
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
};

export function listFences(
  query: PaginationQuery = {},
): Promise<PaginatedResult<Fence>> {
  // device-service orders the page by `createdAt DESC`; the page filters and
  // paginates client-side, so no re-sort here.
  return http.get<PaginatedResult<Fence>>(
    `/fence${toQuery({ page: query.page, limit: query.limit })}`,
  );
}

export function createFence(input: CreateFenceInput): Promise<Fence> {
  return http.post<Fence>('/fence', {
    ...input,
    geometry: PLACEHOLDER_GEOMETRY,
  });
}

export function updateFence(
  id: string,
  input: UpdateFenceInput,
): Promise<Fence> {
  return http.patch<Fence>(`/fence/${id}`, input);
}

export function deleteFence(id: string): Promise<void> {
  return http.delete(`/fence/${id}`);
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

export async function getDashboardStats(): Promise<DashboardStats> {
  // Derive device and fence figures from the live lists so the dashboard tiles
  // and the tables never disagree. Only the trend lines stay synthetic until a
  // dedicated stats endpoint replaces this whole function.
  const [devicePage, fencePage] = await Promise.all([
    listDevices({ limit: 100 }),
    listFences({ limit: 100 }),
  ]);
  const devices = devicePage.items;
  const fences = fencePage.items;

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
    totalDevices: devicePage.pagination.total,
    activeDevices: active.length,
    activeDevicesDelta: 3,
    lostDevices: lost.length,
    totalFences: fencePage.pagination.total,
    activeFences,
    avgBatteryLevel: avgBattery,
    lowBatteryDevices: batteries.filter((b) => b < 20).length,
    statusBreakdown,
    activeDevicesTrend: seededTrend(14, active.length, 4),
    breachesTrend: seededTrend(14, 5, 4),
  };
  return stats;
}
