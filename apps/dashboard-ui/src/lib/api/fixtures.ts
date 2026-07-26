import {
  BreachDirection,
  DeviceStatus,
  DeviceType,
  FenceSeverity,
  GeofenceType,
  type Device,
  type Fence,
} from './types.ts';

/*
 * Deterministic seed data used by the mock client. Shapes mirror device-service
 * so the UI renders real-looking fleets before dashboard-api exists. Coordinates
 * cluster around a fictional ranch in the Scottish Highlands.
 */

const RANCH = { lat: 56.82, lng: -5.1 };
const HERDS = ['herd-north', 'herd-south', 'herd-east', null];

function isoDaysAgo(days: number, hoursJitter = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(d.getUTCHours() - hoursJitter);
  return d.toISOString();
}

function makeDevice(i: number): Device {
  // Weighted status spread: mostly ACTIVE, a few INACTIVE/LOST/DECOMMISSIONED.
  const statusRoll = i % 10;
  const status =
    statusRoll < 6
      ? DeviceStatus.ACTIVE
      : statusRoll < 8
        ? DeviceStatus.INACTIVE
        : statusRoll === 8
          ? DeviceStatus.LOST
          : DeviceStatus.DECOMMISSIONED;

  const isActive = status === DeviceStatus.ACTIVE;
  const battery = isActive
    ? 100 - ((i * 7) % 75)
    : status === DeviceStatus.LOST
      ? (i * 3) % 20
      : status === DeviceStatus.INACTIVE
        ? null
        : null;

  const lastSeenHours =
    status === DeviceStatus.LOST ? 26 + (i % 12) : (i % 5) + 1;

  return {
    id: `dev-${String(i + 1).padStart(4, '0')}`,
    serialNumber: `HL-${(2024000 + i * 137).toString(36).toUpperCase()}`,
    name: `Collar #${100 + i}`,
    type: i % 3 === 0 ? DeviceType.COLLAR_V2 : DeviceType.COLLAR_V1,
    status,
    herdId: HERDS[i % HERDS.length],
    lastLatitude:
      status === DeviceStatus.INACTIVE
        ? null
        : RANCH.lat + (((i * 13) % 40) - 20) / 1000,
    lastLongitude:
      status === DeviceStatus.INACTIVE
        ? null
        : RANCH.lng + (((i * 29) % 40) - 20) / 1000,
    lastSeenAt:
      status === DeviceStatus.INACTIVE ? null : isoDaysAgo(0, lastSeenHours),
    batteryLevel: battery,
    metadata: i % 4 === 0 ? { sampleRateSec: 30, firmware: '2.3.1' } : {},
    createdAt: isoDaysAgo(120 - i),
    updatedAt: isoDaysAgo(0, lastSeenHours),
  };
}

// A closed square ring roughly `size` degrees across, centred on the ranch.
function squareRing(dLat: number, dLng: number, size: number): number[][][] {
  const lat = RANCH.lat + dLat;
  const lng = RANCH.lng + dLng;
  const h = size / 2;
  return [
    [
      [lng - h, lat - h],
      [lng + h, lat - h],
      [lng + h, lat + h],
      [lng - h, lat + h],
      [lng - h, lat - h],
    ],
  ];
}

export function seedDevices(): Device[] {
  return Array.from({ length: 24 }, (_, i) => makeDevice(i));
}

export function seedFences(): Fence[] {
  const base: Array<
    Partial<Fence> & Pick<Fence, 'name' | 'type' | 'severity'>
  > = [
    {
      name: 'North Paddock',
      description: 'Primary grazing enclosure for the northern herd.',
      type: GeofenceType.INCLUSION,
      severity: FenceSeverity.MEDIUM,
      breachDirection: BreachDirection.EXIT,
      herdIds: ['herd-north'],
      active: true,
    },
    {
      name: 'River Dee Buffer',
      description: 'Keep livestock away from the riverbank during floods.',
      type: GeofenceType.EXCLUSION,
      severity: FenceSeverity.CRITICAL,
      breachDirection: BreachDirection.ENTER,
      herdIds: [],
      active: true,
    },
    {
      name: 'South Paddock',
      description: 'Seasonal enclosure — southern cohort.',
      type: GeofenceType.INCLUSION,
      severity: FenceSeverity.LOW,
      breachDirection: BreachDirection.EXIT,
      herdIds: ['herd-south'],
      active: true,
    },
    {
      name: 'Highway A82 Margin',
      description: 'Road exclusion — high injury risk.',
      type: GeofenceType.EXCLUSION,
      severity: FenceSeverity.HIGH,
      breachDirection: BreachDirection.ENTER,
      herdIds: [],
      active: true,
    },
    {
      name: 'East Winter Pen',
      description: 'Winter-only shelter zone.',
      type: GeofenceType.INCLUSION,
      severity: FenceSeverity.MEDIUM,
      breachDirection: BreachDirection.BOTH,
      herdIds: ['herd-east'],
      active: false,
    },
    {
      name: "Neighbour's Land",
      description: 'Boundary with the McRae croft.',
      type: GeofenceType.EXCLUSION,
      severity: FenceSeverity.HIGH,
      breachDirection: BreachDirection.ENTER,
      herdIds: [],
      active: true,
    },
  ];

  return base.map((f, i) => ({
    id: `fence-${String(i + 1).padStart(4, '0')}`,
    description: f.description,
    breachDirection: f.breachDirection ?? BreachDirection.BOTH,
    geometry: {
      type: 'Polygon' as const,
      coordinates: squareRing(
        ((i % 3) - 1) * 0.02,
        (Math.floor(i / 3) - 0.5) * 0.03,
        0.015,
      ),
    },
    active: f.active ?? true,
    herdIds: f.herdIds ?? [],
    alertCooldownSeconds: 300,
    metadata: {},
    createdBy: 'rancher@herdlink.io',
    createdAt: isoDaysAgo(90 - i * 5),
    updatedAt: isoDaysAgo(i),
    ...f,
  }));
}
