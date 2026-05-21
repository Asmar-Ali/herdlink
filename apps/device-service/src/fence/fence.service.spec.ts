import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { UpdateFenceDto } from './dto/update-fence.dto.js';
import { BreachDirection, GeofenceType } from './entities/fence.entity.js';
import { FenceRepository } from './fence.repository.js';
import { FenceService } from './fence.service.js';
import type { FenceResponse } from './fence.types.js';

const makeFence = (overrides: Partial<FenceResponse> = {}): FenceResponse => ({
  id: '507f1f77bcf86cd799439011',
  name: 'North Paddock',
  type: GeofenceType.INCLUSION,
  breachDirection: BreachDirection.BOTH,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
  active: true,
  herdIds: [],
  alertCooldownSeconds: 300,
  severity: 'MEDIUM',
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('FenceService', () => {
  let service: FenceService;
  let repo: jest.Mocked<FenceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FenceService,
        {
          provide: FenceRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          } satisfies Partial<FenceRepository>,
        },
      ],
    }).compile();

    service = module.get(FenceService);
    repo = module.get(FenceRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('delegates to repository and returns the result', async () => {
      const dto: CreateFenceDto = {
        name: 'North Paddock',
        type: GeofenceType.INCLUSION,
        geometry: makeFence().geometry,
      };
      const fence = makeFence();
      repo.create.mockResolvedValue(fence);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(fence);
    });
  });

  describe('findAll', () => {
    it('delegates to repository', async () => {
      const fences = [makeFence(), makeFence({ id: '507f1f77bcf86cd799439012' })];
      repo.findAll.mockResolvedValue(fences);

      await expect(service.findAll()).resolves.toBe(fences);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the fence when found', async () => {
      const fence = makeFence();
      repo.findById.mockResolvedValue(fence);

      await expect(service.findOne(fence.id)).resolves.toBe(fence);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('returns the updated fence', async () => {
      const dto: UpdateFenceDto = { name: 'Renamed' };
      const fence = makeFence({ name: 'Renamed' });
      repo.update.mockResolvedValue(fence);

      await expect(
        service.update('507f1f77bcf86cd799439011', dto),
      ).resolves.toBe(fence);
    });

    it('throws NotFoundException when missing', async () => {
      repo.update.mockResolvedValue(null);

      await expect(
        service.update('507f1f77bcf86cd799439011', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('delegates to repository when deleted', async () => {
      repo.remove.mockResolvedValue(true);

      await expect(
        service.remove('507f1f77bcf86cd799439011'),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException when missing', async () => {
      repo.remove.mockResolvedValue(false);

      await expect(
        service.remove('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
