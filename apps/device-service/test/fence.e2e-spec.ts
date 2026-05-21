import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Model } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { CORRELATION_ID_HEADER } from '../src/common/middleware/correlation-id.middleware';
import {
  BreachDirection,
  Geofence,
  GeofenceDocument,
  GeofenceType,
} from '../src/fence/entities/fence.entity';

const BASE = '/api/v1/fence';

const closedRing = [
  [
    [144.9, -37.8],
    [145.0, -37.8],
    [145.0, -37.7],
    [144.9, -37.7],
    [144.9, -37.8],
  ],
];

const minimalDto = (suffix: string) => ({
  name: `Paddock ${suffix}`,
  type: GeofenceType.INCLUSION,
  geometry: { type: 'Polygon' as const, coordinates: closedRing },
});

const payload = <T>(body: { data: T }): T => body.data;

describe('Fence (e2e)', () => {
  let app: INestApplication;
  let geofenceModel: Model<GeofenceDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    geofenceModel = moduleRef.get(getModelToken(Geofence.name));
  });

  afterEach(async () => {
    await geofenceModel.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('cross-cutting concerns', () => {
    it('wraps success responses in { data, meta }', async () => {
      const res = await request(app.getHttpServer())
        .get(BASE)
        .set(CORRELATION_ID_HEADER, 'cid-fence-001')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta.timestamp');
      expect(res.body.meta.correlationId).toBe('cid-fence-001');
    });

    it('rejects unknown properties with 400 (whitelist)', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({ ...minimalDto('WL'), bogusField: 'nope' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('bogusField');
    });

    it('rejects invalid object id params with 400', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/not-a-valid-object-id`)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/fence', () => {
    it('201 — creates a fence with defaults', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send(minimalDto('001'))
        .expect(201);

      const body = payload<{
        id: string;
        name: string;
        type: GeofenceType;
        breachDirection: BreachDirection;
        active: boolean;
        herdIds: string[];
        alertCooldownSeconds: number;
        severity: string;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>(res.body);

      expect(body.id).toMatch(/^[a-f0-9]{24}$/);
      expect(body.name).toBe('Paddock 001');
      expect(body.type).toBe(GeofenceType.INCLUSION);
      expect(body.breachDirection).toBe(BreachDirection.BOTH);
      expect(body.active).toBe(true);
      expect(body.herdIds).toEqual([]);
      expect(body.alertCooldownSeconds).toBe(300);
      expect(body.severity).toBe('MEDIUM');
      expect(body.metadata).toEqual({});
      expect(body.createdAt).toBeDefined();
    });

    it('400 — missing required fields fail validation', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({ name: 'no geometry', type: GeofenceType.INCLUSION })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('geometry');
    });

    it('422 — unclosed polygon ring is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({
          name: 'Bad ring',
          type: GeofenceType.INCLUSION,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
              ],
            ],
          },
        })
        .expect(422);

      expect(res.body.statusCode).toBe(422);
      expect(res.body.message).toContain('closed');
    });
  });

  describe('GET /api/v1/fence', () => {
    it('200 — returns empty array when no fences', async () => {
      const res = await request(app.getHttpServer()).get(BASE).expect(200);
      expect(payload(res.body)).toEqual([]);
    });

    it('200 — returns fences ordered by createdAt DESC', async () => {
      await request(app.getHttpServer()).post(BASE).send(minimalDto('A'));
      await request(app.getHttpServer()).post(BASE).send(minimalDto('B'));

      const res = await request(app.getHttpServer()).get(BASE).expect(200);
      const list = payload<Array<{ name: string }>>(res.body);

      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('Paddock B');
      expect(list[1].name).toBe('Paddock A');
    });
  });

  describe('GET /api/v1/fence/:id', () => {
    it('200 — returns the fence by id', async () => {
      const created = payload<{ id: string }>(
        (await request(app.getHttpServer()).post(BASE).send(minimalDto('002')))
          .body,
      );

      const res = await request(app.getHttpServer())
        .get(`${BASE}/${created.id}`)
        .expect(200);

      const body = payload<{ id: string; name: string }>(res.body);
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Paddock 002');
    });

    it('404 — unknown id returns Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/507f1f77bcf86cd799439011`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/v1/fence/:id', () => {
    it('200 — updates allowed fields', async () => {
      const created = payload<{ id: string }>(
        (await request(app.getHttpServer()).post(BASE).send(minimalDto('003')))
          .body,
      );

      const res = await request(app.getHttpServer())
        .patch(`${BASE}/${created.id}`)
        .send({ name: 'Renamed Paddock', active: false })
        .expect(200);

      const body = payload<{ name: string; active: boolean }>(res.body);
      expect(body.name).toBe('Renamed Paddock');
      expect(body.active).toBe(false);
    });

    it('404 — patching unknown id returns Not Found', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/507f1f77bcf86cd799439011`)
        .send({ name: 'Ghost' })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/fence/:id', () => {
    it('200 — deletes a fence', async () => {
      const created = payload<{ id: string }>(
        (await request(app.getHttpServer()).post(BASE).send(minimalDto('005')))
          .body,
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${created.id}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/${created.id}`)
        .expect(404);
    });

    it('404 — deleting unknown id returns Not Found', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${BASE}/507f1f77bcf86cd799439011`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });
  });
});
