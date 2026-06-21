import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';
import { DeviceRepository } from './device.repository';
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

describe('DeviceRepository', () => {
  let deviceRepository: DeviceRepository;

  // Mocked inner Repository<Device> methods
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  } satisfies Partial<Repository<Device>>;

  // DataSource mock: getRepository() returns the repo stub above
  const dataSourceMock = {
    getRepository: jest.fn().mockReturnValue(repo),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceRepository,
        {
          provide: getDataSourceToken(),
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    deviceRepository = module.get(DeviceRepository);
  });

  it('should be defined', () => {
    expect(deviceRepository).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('builds a row with COLLAR_V1 / INACTIVE defaults and saves it', async () => {
      const input: DeepPartial<Device> = {
        serialNumber: 'SN-001',
        name: 'Cow #1',
      };
      const built = makeDevice();
      const saved = makeDevice({ id: 'uuid-1' });

      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      const result = await deviceRepository.create(input);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DeviceType.COLLAR_V1,
          status: DeviceStatus.INACTIVE,
          serialNumber: 'SN-001',
          name: 'Cow #1',
          metadata: {},
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });

    it('preserves explicit type / status overrides', async () => {
      const input: DeepPartial<Device> = {
        serialNumber: 'SN-002',
        name: 'Cow #2',
        type: DeviceType.COLLAR_V2,
        status: DeviceStatus.ACTIVE,
      };
      const built = makeDevice({
        type: DeviceType.COLLAR_V2,
        status: DeviceStatus.ACTIVE,
      });
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      await deviceRepository.create(input);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DeviceType.COLLAR_V2,
          status: DeviceStatus.ACTIVE,
        }),
      );
    });

    it('defaults metadata to {} when not provided', async () => {
      repo.create.mockReturnValue(makeDevice());
      repo.save.mockResolvedValue(makeDevice());

      await deviceRepository.create({ serialNumber: 'SN-003', name: 'Cow #3' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} }),
      );
    });
  });

  // ─── findPage ─────────────────────────────────────────────────────────────

  describe('findPage', () => {
    it('returns a page of devices ordered by createdAt DESC', async () => {
      const devices = [
        makeDevice({ id: 'uuid-2' }),
        makeDevice({ id: 'uuid-1' }),
      ];
      repo.findAndCount.mockResolvedValue([devices, 5]);

      const result = await deviceRepository.findPage(2, 2);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 2,
        take: 2,
      });
      expect(result).toEqual({ items: devices, total: 5 });
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the device when found', async () => {
      const device = makeDevice();
      repo.findOne.mockResolvedValue(device);

      const result = await deviceRepository.findById('uuid-1');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toBe(device);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await deviceRepository.findById('no-such-id');

      expect(result).toBeNull();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('merges the patch and saves when the device exists', async () => {
      const existing = makeDevice();
      const patched = makeDevice({ name: 'Updated Name' });

      repo.findOne.mockResolvedValue(existing);
      repo.merge.mockImplementation((entity, patch) =>
        Object.assign(entity, patch),
      );
      repo.save.mockResolvedValue(patched);

      const result = await deviceRepository.update('uuid-1', {
        name: 'Updated Name',
      });

      expect(repo.merge).toHaveBeenCalledWith(existing, {
        name: 'Updated Name',
      });
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(patched);
    });

    it('returns null without touching the db when device is not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await deviceRepository.update('no-such-id', {
        name: 'Ghost',
      });

      expect(repo.merge).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns true when a row was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });

      const result = await deviceRepository.remove('uuid-1');

      expect(repo.delete).toHaveBeenCalledWith('uuid-1');
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      const result = await deviceRepository.remove('no-such-id');

      expect(result).toBe(false);
    });

    it('returns false when affected is undefined', async () => {
      repo.delete.mockResolvedValue({});

      const result = await deviceRepository.remove('uuid-1');

      expect(result).toBe(false);
    });
  });
});
