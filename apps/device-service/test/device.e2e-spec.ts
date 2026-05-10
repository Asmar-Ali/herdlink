import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DeviceStatus, DeviceType } from '../src/device/entities/device.entity';

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildApp(app: INestApplication) {
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}

const BASE = '/api/v1/device';

const minimalDto = (suffix: string) => ({
  serialNumber: `SN-E2E-${suffix}`,
  name: `Cow ${suffix}`,
});

// ─── suite ────────────────────────────────────────────────────────────────────

describe('Device (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    buildApp(app);
    await app.init();

    dataSource = moduleRef.get(getDataSourceToken());
  });

  afterEach(async () => {
    // wipe devices between tests so each test starts clean
    await dataSource.query(`TRUNCATE TABLE devices RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /device ────────────────────────────────────────────────────────

  describe('POST /api/v1/device', () => {
    it('201 — creates a device with defaults', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send(minimalDto('001'))
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.serialNumber).toBe('SN-E2E-001');
      expect(res.body.name).toBe('Cow 001');
      expect(res.body.type).toBe(DeviceType.COLLAR_V1);
      expect(res.body.status).toBe(DeviceStatus.INACTIVE);
      expect(res.body.metadata).toEqual({});
      expect(res.body.createdAt).toBeDefined();
    });

    it('409 — duplicate serialNumber returns Conflict', async () => {
      await request(app.getHttpServer()).post(BASE).send(minimalDto('DUP'));

      const res = await request(app.getHttpServer())
        .post(BASE)
        .send(minimalDto('DUP'))
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('SN-E2E-DUP');
      expect(res.body.path).toBe(BASE);
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─── GET /device ─────────────────────────────────────────────────────────

  describe('GET /api/v1/device', () => {
    it('200 — returns empty array when no devices', async () => {
      const res = await request(app.getHttpServer()).get(BASE).expect(200);
      expect(res.body).toEqual([]);
    });

    it('200 — returns all devices ordered by createdAt DESC', async () => {
      await request(app.getHttpServer()).post(BASE).send(minimalDto('A'));
      await request(app.getHttpServer()).post(BASE).send(minimalDto('B'));

      const res = await request(app.getHttpServer()).get(BASE).expect(200);

      expect(res.body).toHaveLength(2);
      // DESC order: B was created last
      expect(res.body[0].serialNumber).toBe('SN-E2E-B');
      expect(res.body[1].serialNumber).toBe('SN-E2E-A');
    });
  });

  // ─── GET /device/:id ─────────────────────────────────────────────────────

  describe('GET /api/v1/device/:id', () => {
    it('200 — returns the device by id', async () => {
      const created = (
        await request(app.getHttpServer()).post(BASE).send(minimalDto('002'))
      ).body;

      const res = await request(app.getHttpServer())
        .get(`${BASE}/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.serialNumber).toBe('SN-E2E-002');
    });

    it('404 — unknown id returns Not Found with correct shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toContain('not found');
    });
  });

  // ─── PATCH /device/:id ───────────────────────────────────────────────────

  describe('PATCH /api/v1/device/:id', () => {
    it('200 — updates allowed fields', async () => {
      const created = (
        await request(app.getHttpServer()).post(BASE).send(minimalDto('003'))
      ).body;

      const res = await request(app.getHttpServer())
        .patch(`${BASE}/${created.id}`)
        .send({ name: 'Renamed Cow', batteryLevel: 87 })
        .expect(200);

      expect(res.body.name).toBe('Renamed Cow');
      expect(res.body.batteryLevel).toBe(87);
      expect(res.body.serialNumber).toBe('SN-E2E-003'); // unchanged
    });

    it('404 — patching unknown id returns Not Found', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .send({ name: 'Ghost' })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('422 — cannot decommission an ACTIVE device directly', async () => {
      const created = (
        await request(app.getHttpServer()).post(BASE).send(minimalDto('004'))
      ).body;

      // make it ACTIVE first
      await request(app.getHttpServer())
        .patch(`${BASE}/${created.id}`)
        .send({ status: DeviceStatus.ACTIVE });

      const res = await request(app.getHttpServer())
        .patch(`${BASE}/${created.id}`)
        .send({ status: DeviceStatus.DECOMMISSIONED })
        .expect(422);

      expect(res.body.statusCode).toBe(422);
      expect(res.body.message).toContain('INACTIVE first');
    });
  });

  // ─── DELETE /device/:id ──────────────────────────────────────────────────

  describe('DELETE /api/v1/device/:id', () => {
    it('200 — deletes an inactive device', async () => {
      const created = (
        await request(app.getHttpServer()).post(BASE).send(minimalDto('005'))
      ).body;

      await request(app.getHttpServer())
        .delete(`${BASE}/${created.id}`)
        .expect(200);

      // confirm it's gone
      await request(app.getHttpServer())
        .get(`${BASE}/${created.id}`)
        .expect(404);
    });

    it('404 — deleting unknown id returns Not Found', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('422 — cannot delete an ACTIVE device', async () => {
      const created = (
        await request(app.getHttpServer()).post(BASE).send(minimalDto('006'))
      ).body;

      await request(app.getHttpServer())
        .patch(`${BASE}/${created.id}`)
        .send({ status: DeviceStatus.ACTIVE });

      const res = await request(app.getHttpServer())
        .delete(`${BASE}/${created.id}`)
        .expect(422);

      expect(res.body.statusCode).toBe(422);
      expect(res.body.message).toContain('Decommission it first');
    });
  });
});
