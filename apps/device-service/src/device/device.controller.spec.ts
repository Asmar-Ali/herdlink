import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceController } from './device.controller';
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

describe('DeviceController', () => {
  let controller: DeviceController;
  let service: jest.Mocked<DeviceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        {
          provide: DeviceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          } satisfies Partial<DeviceService>,
        },
      ],
    }).compile();

    controller = module.get(DeviceController);
    service = module.get(DeviceService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('forwards dto to service and returns result', async () => {
      const dto: CreateDeviceDto = { serialNumber: 'SN-001', name: 'Cow #1' };
      const device = makeDevice();
      service.create.mockResolvedValue(device);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(device);
    });

    it('propagates service errors', async () => {
      service.create.mockRejectedValue(new Error('conflict'));

      await expect(
        controller.create({ serialNumber: 'SN-001', name: 'Cow #1' }),
      ).rejects.toThrow('conflict');
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all devices from service', async () => {
      const devices = [
        makeDevice({ id: 'uuid-1' }),
        makeDevice({ id: 'uuid-2' }),
      ];
      service.findAll.mockResolvedValue(devices);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(devices);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('passes id as string to service', async () => {
      const device = makeDevice();
      service.findOne.mockResolvedValue(device);

      const result = await controller.findOne('uuid-1');

      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toBe(device);
    });

    it('propagates NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Device uuid-x not found'),
      );

      await expect(controller.findOne('uuid-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('passes string id and dto to service', async () => {
      const dto: UpdateDeviceDto = { name: 'Updated' };
      const updated = makeDevice({ name: 'Updated' });
      service.update.mockResolvedValue(updated);

      const result = await controller.update('uuid-1', dto);

      expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result).toBe(updated);
    });

    it('propagates NotFoundException from service', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Device uuid-x not found'),
      );

      await expect(controller.update('uuid-x', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('passes string id to service and resolves', async () => {
      service.remove.mockResolvedValue(undefined);

      await expect(controller.remove('uuid-1')).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('uuid-1');
    });

    it('propagates NotFoundException from service', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Device uuid-x not found'),
      );

      await expect(controller.remove('uuid-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── isolation ────────────────────────────────────────────────────────────

  it('does not call unrelated service methods on findAll', async () => {
    service.findAll.mockResolvedValue([]);

    await controller.findAll();

    expect(service.create).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
});
