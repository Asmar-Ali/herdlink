import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { DeviceRepository } from './device.repository';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device, DeviceStatus, DeviceType } from './entities/device.entity';

const makeDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 'uuid-1',
  serialNumber: 'SN-001',
  name: 'Cow #1',
  type: DeviceType.COLLAR_V1,
  status: DeviceStatus.INACTIVE,
  herdId: null,
  lastLatitude: null,
  lastLongitude: null,
  lastSeenAt: null,
  batteryLevel: null,
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('DeviceService', () => {
  let service: DeviceService;
  let repo: jest.Mocked<DeviceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: DeviceRepository,
          useValue: {
            create: jest.fn(),
            findPage: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          } satisfies Partial<DeviceRepository>,
        },
      ],
    }).compile();

    service = module.get(DeviceService);
    repo = module.get(DeviceRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('delegates to repository and returns the result', async () => {
      const dto: CreateDeviceDto = { serialNumber: 'SN-001', name: 'Cow #1' };
      const device = makeDevice();
      repo.create.mockResolvedValue(device);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(device);
    });

    it('propagates repository errors (e.g. ConflictException)', async () => {
      const dto: CreateDeviceDto = { serialNumber: 'SN-001', name: 'Cow #1' };
      repo.create.mockRejectedValue(new Error('conflict'));

      await expect(service.create(dto)).rejects.toThrow('conflict');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated devices from repository', async () => {
      const devices = [
        makeDevice({ id: 'uuid-1' }),
        makeDevice({ id: 'uuid-2' }),
      ];
      repo.findPage.mockResolvedValue({ items: devices, total: 5 });

      const query: PaginationQueryDto = { page: 2, limit: 2 };
      const result = await service.findAll(query);

      expect(repo.findPage).toHaveBeenCalledWith(2, 2);
      expect(result).toEqual({
        items: devices,
        pagination: {
          page: 2,
          limit: 2,
          total: 5,
          totalPages: 3,
        },
      });
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the device when found', async () => {
      const device = makeDevice();
      repo.findById.mockResolvedValue(device);

      const result = await service.findOne('uuid-1');

      expect(repo.findById).toHaveBeenCalledWith('uuid-1');
      expect(result).toBe(device);
    });

    it('throws NotFoundException when device does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('no-such-id')).rejects.toThrow(
        new NotFoundException('Device no-such-id not found'),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns the updated device when found', async () => {
      const dto: UpdateDeviceDto = { name: 'Updated' };
      const updated = makeDevice({ name: 'Updated' });
      repo.update.mockResolvedValue(updated);

      const result = await service.update('uuid-1', dto);

      expect(repo.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when repository returns null', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update('no-such-id', {})).rejects.toThrow(
        new NotFoundException('Device no-such-id not found'),
      );
    });

    it('propagates repository errors (e.g. UnprocessableEntityException)', async () => {
      repo.update.mockRejectedValue(new Error('unprocessable'));

      await expect(service.update('uuid-1', {})).rejects.toThrow(
        'unprocessable',
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('resolves without a value when device is deleted', async () => {
      repo.remove.mockResolvedValue(true);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith('uuid-1');
    });

    it('throws NotFoundException when repository returns false', async () => {
      repo.remove.mockResolvedValue(false);

      await expect(service.remove('no-such-id')).rejects.toThrow(
        new NotFoundException('Device no-such-id not found'),
      );
    });

    it('propagates repository errors (e.g. UnprocessableEntityException)', async () => {
      repo.remove.mockRejectedValue(new Error('active device'));

      await expect(service.remove('uuid-1')).rejects.toThrow('active device');
    });
  });
});
