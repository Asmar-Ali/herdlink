import { TokenService } from '@herdlink/auth';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { CORRELATION_ID_HEADER } from '@herdlink/observability';
import { DeviceStatus, DeviceType } from '../src/device/entities/device.entity';

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = '/api/v1/device';

const minimalDto = (suffix: string) => ({
  serialNumber: `SN-E2E-${suffix}`,
  name: `Cow ${suffix}`,
});

// Pull payload out of the global envelope.
const payload = <T>(body: { data: T }): T => body.data;

// ─── suite ────────────────────────────────────────────────────────────────────

describe('Device (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authHeader: string;

  // Mutations are protected by JwtAuthGuard by default (reads are @Public());
  // sign a real token through the same TokenService the app uses so these
  // tests exercise the actual auth path, not a bypass.
  const post = (path: string) =>
    request(app.getHttpServer()).post(path).set('Authorization', authHeader);
  const patch = (path: string) =>
    request(app.getHttpServer()).patch(path).set('Authorization', authHeader);
  const del = (path: string) =>
    request(app.getHttpServer())
      .delete(path)
      .set('Authorization', authHeader);
  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(getDataSourceToken());

    const tokenService = moduleRef.get(TokenService);
    const token = await tokenService.signUser('user:e2e-test', ['operator']);
    authHeader = `Bearer ${token}`;
  });

  afterEach(async () => {
    // wipe devices between tests so each test starts clean
    await dataSource.query(`TRUNCATE TABLE devices RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── envelope + correlation id ───────────────────────────────────────────

  describe('cross-cutting concerns', () => {
    it('wraps success responses in { data, meta } and echoes correlation id', async () => {
      const res = await get(BASE)
        .set(CORRELATION_ID_HEADER, 'cid-fixed-001')
        .expect(200);

      expect(res.headers[CORRELATION_ID_HEADER]).toBe('cid-fixed-001');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta.timestamp');
      expect(res.body.meta.correlationId).toBe('cid-fixed-001');
    });

    it('generates a correlation id when the caller omits one', async () => {
      const res = await get(BASE).expect(200);
      expect(res.headers[CORRELATION_ID_HEADER]).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('rejects unknown properties with 400 (whitelist)', async () => {
      const res = await post(BASE)
        .send({ ...minimalDto('WL'), bogusField: 'nope' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('bogusField');
    });

    it('rejects invalid uuid params with 400 (ParseUUIDPipe)', async () => {
      const res = await get(`${BASE}/not-a-uuid`).expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // ─── auth ─────────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('200 — GET routes are public and need no token', async () => {
      await get(BASE).expect(200);
    });

    it('401 — mutations without a bearer token are rejected', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .send(minimalDto('NOAUTH'))
        .expect(401);
    });

    it('401 — mutations with a token signed by another secret are rejected', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', 'Bearer not-a-valid-token')
        .send(minimalDto('BADAUTH'))
        .expect(401);
    });
  });

  // ─── POST /device ────────────────────────────────────────────────────────

  describe('POST /api/v1/device', () => {
    it('201 — creates a device with defaults', async () => {
      const res = await post(BASE).send(minimalDto('001')).expect(201);

      const body = payload<{
        id: string;
        serialNumber: string;
        name: string;
        type: DeviceType;
        status: DeviceStatus;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>(res.body);

      expect(body.id).toBeDefined();
      expect(body.serialNumber).toBe('SN-E2E-001');
      expect(body.name).toBe('Cow 001');
      expect(body.type).toBe(DeviceType.COLLAR_V1);
      expect(body.status).toBe(DeviceStatus.INACTIVE);
      expect(body.metadata).toEqual({});
      expect(body.createdAt).toBeDefined();
    });

    it('400 — missing required field fails validation', async () => {
      const res = await post(BASE)
        .send({ name: 'no serial here' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('serialNumber');
    });

    it('409 — duplicate serialNumber returns Conflict', async () => {
      await post(BASE).send(minimalDto('DUP'));

      const res = await post(BASE).send(minimalDto('DUP')).expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('SN-E2E-DUP');
      expect(res.body.path).toBe(BASE);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.correlationId).toBeDefined();
    });
  });

  // ─── GET /device ─────────────────────────────────────────────────────────

  describe('GET /api/v1/device', () => {
    it('200 — returns empty paginated result when no devices', async () => {
      const res = await get(BASE).expect(200);
      expect(payload(res.body)).toEqual({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('200 — returns devices ordered by createdAt DESC', async () => {
      await post(BASE).send(minimalDto('A'));
      await post(BASE).send(minimalDto('B'));

      const res = await get(BASE).expect(200);
      const body = payload<{
        items: Array<{ serialNumber: string }>;
        pagination: { total: number };
      }>(res.body);

      expect(body.items).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
      // DESC order: B was created last
      expect(body.items[0].serialNumber).toBe('SN-E2E-B');
      expect(body.items[1].serialNumber).toBe('SN-E2E-A');
    });

    it('200 — paginates with page and limit query params', async () => {
      await post(BASE).send(minimalDto('1'));
      await post(BASE).send(minimalDto('2'));
      await post(BASE).send(minimalDto('3'));

      const page1 = payload<{
        items: Array<{ serialNumber: string }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>((await get(`${BASE}?page=1&limit=2`)).body);

      expect(page1.items).toHaveLength(2);
      expect(page1.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(page1.items[0].serialNumber).toBe('SN-E2E-3');
      expect(page1.items[1].serialNumber).toBe('SN-E2E-2');

      const page2 = payload<{
        items: Array<{ serialNumber: string }>;
        pagination: { page: number; totalPages: number };
      }>((await get(`${BASE}?page=2&limit=2`)).body);

      expect(page2.items).toHaveLength(1);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.totalPages).toBe(2);
      expect(page2.items[0].serialNumber).toBe('SN-E2E-1');
    });

    it('400 — rejects invalid pagination query params', async () => {
      const res = await get(`${BASE}?page=0&limit=500`).expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  // ─── GET /device/:id ─────────────────────────────────────────────────────

  describe('GET /api/v1/device/:id', () => {
    it('200 — returns the device by id', async () => {
      const created = payload<{ id: string }>(
        (await post(BASE).send(minimalDto('002'))).body,
      );

      const res = await get(`${BASE}/${created.id}`).expect(200);

      const body = payload<{ id: string; serialNumber: string }>(res.body);
      expect(body.id).toBe(created.id);
      expect(body.serialNumber).toBe('SN-E2E-002');
    });

    it('404 — unknown id returns Not Found with correct shape', async () => {
      const res = await get(
        `${BASE}/00000000-0000-0000-0000-000000000000`,
      ).expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toContain('not found');
    });
  });

  // ─── PATCH /device/:id ───────────────────────────────────────────────────

  describe('PATCH /api/v1/device/:id', () => {
    it('200 — updates allowed fields', async () => {
      const created = payload<{ id: string }>(
        (await post(BASE).send(minimalDto('003'))).body,
      );

      const res = await patch(`${BASE}/${created.id}`)
        .send({ name: 'Renamed Cow', batteryLevel: 87 })
        .expect(200);

      const body = payload<{
        name: string;
        batteryLevel: number;
        serialNumber: string;
      }>(res.body);
      expect(body.name).toBe('Renamed Cow');
      expect(body.batteryLevel).toBe(87);
      expect(body.serialNumber).toBe('SN-E2E-003'); // unchanged
    });

    it('404 — patching unknown id returns Not Found', async () => {
      const res = await patch(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .send({ name: 'Ghost' })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('422 — cannot decommission an ACTIVE device directly', async () => {
      const created = payload<{ id: string }>(
        (await post(BASE).send(minimalDto('004'))).body,
      );

      // make it ACTIVE first
      await patch(`${BASE}/${created.id}`).send({
        status: DeviceStatus.ACTIVE,
      });

      const res = await patch(`${BASE}/${created.id}`)
        .send({ status: DeviceStatus.DECOMMISSIONED })
        .expect(422);

      expect(res.body.statusCode).toBe(422);
      expect(res.body.message).toContain('INACTIVE first');
    });
  });

  // ─── DELETE /device/:id ──────────────────────────────────────────────────

  describe('DELETE /api/v1/device/:id', () => {
    it('200 — deletes an inactive device', async () => {
      const created = payload<{ id: string }>(
        (await post(BASE).send(minimalDto('005'))).body,
      );

      await del(`${BASE}/${created.id}`).expect(200);

      // confirm it's gone
      await get(`${BASE}/${created.id}`).expect(404);
    });

    it('404 — deleting unknown id returns Not Found', async () => {
      const res = await del(
        `${BASE}/00000000-0000-0000-0000-000000000000`,
      ).expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('422 — cannot delete an ACTIVE device', async () => {
      const created = payload<{ id: string }>(
        (await post(BASE).send(minimalDto('006'))).body,
      );

      await patch(`${BASE}/${created.id}`).send({
        status: DeviceStatus.ACTIVE,
      });

      const res = await del(`${BASE}/${created.id}`).expect(422);

      expect(res.body.statusCode).toBe(422);
      expect(res.body.message).toContain('Decommission it first');
    });
  });
});
