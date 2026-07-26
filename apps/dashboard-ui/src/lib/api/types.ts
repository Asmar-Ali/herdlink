/*
 * Client-side mirrors of device-service's entities/DTOs. Kept structurally
 * identical to apps/device-service/src/{device,fence} so that when the real
 * dashboard-api lands, only src/lib/api/client.ts changes — not these types
 * nor the components that consume them.
 */

export const DeviceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DECOMMISSIONED: 'DECOMMISSIONED',
  LOST: 'LOST',
} as const;
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

export const DeviceType = {
  COLLAR_V1: 'COLLAR_V1',
  COLLAR_V2: 'COLLAR_V2',
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export interface Device {
  id: string;
  serialNumber: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  herdId: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSeenAt: string | null;
  batteryLevel: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  serialNumber: string;
  name: string;
  type?: DeviceType;
  status?: DeviceStatus;
  herdId?: string | null;
  batteryLevel?: number | null;
}

export type UpdateDeviceInput = Partial<CreateDeviceInput>;

export const GeofenceType = {
  INCLUSION: 'INCLUSION',
  EXCLUSION: 'EXCLUSION',
} as const;
export type GeofenceType = (typeof GeofenceType)[keyof typeof GeofenceType];

export const BreachDirection = {
  ENTER: 'ENTER',
  EXIT: 'EXIT',
  BOTH: 'BOTH',
} as const;
export type BreachDirection =
  (typeof BreachDirection)[keyof typeof BreachDirection];

export const FenceSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type FenceSeverity = (typeof FenceSeverity)[keyof typeof FenceSeverity];

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Fence {
  id: string;
  name: string;
  description?: string;
  type: GeofenceType;
  breachDirection: BreachDirection;
  geometry: GeoJSONPolygon;
  active: boolean;
  herdIds: string[];
  alertCooldownSeconds: number;
  severity: FenceSeverity;
  metadata: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFenceInput {
  name: string;
  description?: string;
  type: GeofenceType;
  breachDirection?: BreachDirection;
  severity?: FenceSeverity;
  active?: boolean;
  herdIds?: string[];
  alertCooldownSeconds?: number;
}

export type UpdateFenceInput = Partial<CreateFenceInput>;

/** Matches device-service's common/pagination PaginatedResult<T>. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Derived aggregates for the dashboard. No backend endpoint yet (see stats.ts). */
export interface TimeseriesPoint {
  date: string; // ISO date (day granularity)
  value: number;
}

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  activeDevicesDelta: number; // vs previous period
  lostDevices: number;
  totalFences: number;
  activeFences: number;
  avgBatteryLevel: number;
  lowBatteryDevices: number;
  statusBreakdown: { status: DeviceStatus; count: number }[];
  activeDevicesTrend: TimeseriesPoint[];
  breachesTrend: TimeseriesPoint[];
}
