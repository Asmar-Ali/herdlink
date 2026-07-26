import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDevice,
  createFence,
  deleteDevice,
  deleteFence,
  listDevices,
  listFences,
  updateFence,
  updateDevice,
} from './client.ts';
import { AUTH_TOKEN_KEY } from '../auth/auth-context.ts';
import {
  BreachDirection,
  DeviceStatus,
  DeviceType,
  FenceSeverity,
  GeofenceType,
  type Device,
  type Fence,
} from './types.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleDevice: Device = {
  id: '11111111-1111-1111-1111-111111111111',
  serialNumber: 'HL-000142',
  name: 'Collar #142',
  type: DeviceType.COLLAR_V1,
  status: DeviceStatus.ACTIVE,
  herdId: 'herd-north',
  lastLatitude: null,
  lastLongitude: null,
  lastSeenAt: null,
  batteryLevel: 87,
  metadata: {},
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('device client → device-service REST API', () => {
  beforeEach(() => localStorage.setItem(AUTH_TOKEN_KEY, 'signed.jwt.token'));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('lists devices with pagination params and unwraps the envelope', async () => {
    const page = {
      items: [sampleDevice],
      pagination: { page: 2, limit: 8, total: 9, totalPages: 2 },
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: page, meta: {} }));

    const result = await listDevices({ page: 2, limit: 8 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/device?page=2&limit=8',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(page);
  });

  it('creates a device and attaches the bearer token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: sampleDevice, meta: {} }));

    const input = {
      serialNumber: 'HL-000142',
      name: 'Collar #142',
      type: DeviceType.COLLAR_V1,
      status: DeviceStatus.ACTIVE,
      herdId: 'herd-north',
      batteryLevel: 87,
    };
    const result = await createDevice(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/device');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer signed.jwt.token',
    );
    expect(result).toEqual(sampleDevice);
  });

  it('patches a device by id', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: { ...sampleDevice, name: 'Bessie' }, meta: {} }),
      );

    const result = await updateDevice(sampleDevice.id, { name: 'Bessie' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/device/${sampleDevice.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Bessie' }),
      }),
    );
    expect(result.name).toBe('Bessie');
  });

  it('deletes a device and resolves void on 204', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteDevice(sampleDevice.id)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/device/${sampleDevice.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces the backend validation message on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: ['name should not be empty'],
        },
        400,
      ),
    );

    await expect(
      createDevice({ serialNumber: 'HL-1', name: '' }),
    ).rejects.toThrow(/name should not be empty/);
  });

  it('surfaces a reachability error when the request never lands', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));

    await expect(listDevices()).rejects.toThrow(/unable to reach the server/i);
  });
});

const sampleFence: Fence = {
  id: '652f1e9a2b3c4d5e6f7a8b9c',
  name: 'North Paddock',
  description: 'Primary grazing enclosure',
  type: GeofenceType.INCLUSION,
  breachDirection: BreachDirection.BOTH,
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
  active: true,
  herdIds: ['herd-north'],
  alertCooldownSeconds: 300,
  severity: FenceSeverity.MEDIUM,
  metadata: {},
  createdBy: 'rancher@herdlink.io',
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('fence client → device-service REST API', () => {
  beforeEach(() => localStorage.setItem(AUTH_TOKEN_KEY, 'signed.jwt.token'));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('lists fences with pagination params and unwraps the envelope', async () => {
    const page = {
      items: [sampleFence],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: page, meta: {} }));

    const result = await listFences({ limit: 100 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/fence?limit=100',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(page);
  });

  it('injects a placeholder polygon on create so the DTO validates', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: sampleFence, meta: {} }));

    const input = {
      name: 'North Paddock',
      description: 'Primary grazing enclosure',
      type: GeofenceType.INCLUSION,
      breachDirection: BreachDirection.BOTH,
      severity: FenceSeverity.MEDIUM,
      active: true,
      alertCooldownSeconds: 300,
      herdIds: ['herd-north'],
    };
    await createFence(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/fence');
    const body = JSON.parse((init?.body as string) ?? '{}');
    expect(body).toMatchObject(input);
    // The form never collects geometry — the client supplies a valid closed ring.
    expect(body.geometry.type).toBe('Polygon');
    const ring = body.geometry.coordinates[0];
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer signed.jwt.token',
    );
  });

  it('patches a fence by id without touching geometry', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: { ...sampleFence, active: false }, meta: {} }),
      );

    const result = await updateFence(sampleFence.id, { active: false });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/fence/${sampleFence.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
      }),
    );
    expect(result.active).toBe(false);
  });

  it('deletes a fence by id', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteFence(sampleFence.id)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/fence/${sampleFence.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
