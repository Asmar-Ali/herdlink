import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { BreachDirection, Geofence, GeofenceType } from './entities/fence.entity.js';
import { FenceRepository } from './fence.repository.js';

const closedRing = [
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ],
];

const baseCreateDto = (): CreateFenceDto => ({
  name: 'North Paddock',
  type: GeofenceType.INCLUSION,
  geometry: { type: 'Polygon', coordinates: closedRing },
});

describe('FenceRepository', () => {
  let repository: FenceRepository;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  const makeDoc = (overrides: Record<string, unknown> = {}) => {
    const _id = new Types.ObjectId();
    const doc = {
      _id,
      name: 'North Paddock',
      type: GeofenceType.INCLUSION,
      breachDirection: BreachDirection.BOTH,
      geometry: { type: 'Polygon', coordinates: closedRing },
      active: true,
      herdIds: [],
      alertCooldownSeconds: 300,
      severity: 'MEDIUM',
      metadata: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      toObject: jest.fn().mockReturnValue({
        _id,
        name: 'North Paddock',
        type: GeofenceType.INCLUSION,
        breachDirection: BreachDirection.BOTH,
        geometry: { type: 'Polygon', coordinates: closedRing },
        active: true,
        herdIds: [],
        alertCooldownSeconds: 300,
        severity: 'MEDIUM',
        metadata: {},
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
      }),
      ...overrides,
    };
    return doc;
  };

  beforeEach(async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };
    model = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(chain),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findById: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FenceRepository,
        { provide: getModelToken(Geofence.name), useValue: model },
      ],
    }).compile();

    repository = module.get(FenceRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('persists with defaults and maps id in the response', async () => {
      const doc = makeDoc();
      model.create.mockResolvedValue(doc);

      const result = await repository.create(baseCreateDto());

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'North Paddock',
          breachDirection: BreachDirection.BOTH,
          active: true,
          herdIds: [],
          alertCooldownSeconds: 300,
          severity: 'MEDIUM',
          metadata: {},
        }),
      );
      expect(result.id).toBe(doc._id.toString());
      expect(result.name).toBe('North Paddock');
    });

    it('rejects unclosed rings', async () => {
      await expect(
        repository.create({
          ...baseCreateDto(),
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
        }),
      ).rejects.toThrow('closed');
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('findPage', () => {
    it('returns a page of fences ordered by createdAt desc', async () => {
      const doc = makeDoc();
      const chain = model.find();
      chain.exec.mockResolvedValue([doc]);
      model.countDocuments().exec.mockResolvedValue(3);

      const result = await repository.findPage(2, 1);

      expect(model.find).toHaveBeenCalled();
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(1);
      expect(chain.limit).toHaveBeenCalledWith(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(doc._id.toString());
      expect(result.total).toBe(3);
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      model.findById().exec.mockResolvedValue(null);
      await expect(repository.findById('507f1f77bcf86cd799439011')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('returns null when not found', async () => {
      model.findByIdAndUpdate().exec.mockResolvedValue(null);
      await expect(
        repository.update('507f1f77bcf86cd799439011', { name: 'X' }),
      ).resolves.toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when a document was deleted', async () => {
      model.findByIdAndDelete().exec.mockResolvedValue(makeDoc());
      await expect(
        repository.remove('507f1f77bcf86cd799439011'),
      ).resolves.toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
      model.findByIdAndDelete().exec.mockResolvedValue(null);
      await expect(
        repository.remove('507f1f77bcf86cd799439011'),
      ).resolves.toBe(false);
    });
  });
});
