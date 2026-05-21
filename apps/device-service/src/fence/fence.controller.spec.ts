import { Test, TestingModule } from '@nestjs/testing';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { UpdateFenceDto } from './dto/update-fence.dto.js';
import { FenceController } from './fence.controller.js';
import { FenceService } from './fence.service.js';

describe('FenceController', () => {
  let controller: FenceController;
  let service: jest.Mocked<FenceService>;

  const baseCreateDto: CreateFenceDto = {
    name: 'Test Fence',
    type: 'INCLUSION' as CreateFenceDto['type'],
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
  };

  const objectId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FenceController],
      providers: [
        {
          provide: FenceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(FenceController);
    service = module.get(FenceService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('forwards dto and returns service result by reference (no transform)', async () => {
      const expected = { id: objectId };
      service.create.mockResolvedValue(expected as never);

      const result = await controller.create(baseCreateDto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(baseCreateDto);
      expect(result).toBe(expected);
    });
  });

  describe('findAll', () => {
    it('calls service.findAll with no args and returns result by reference', async () => {
      const expected = [{ id: objectId }, { id: '507f1f77bcf86cd799439012' }];
      service.findAll.mockResolvedValue(expected as never);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });

  describe('findOne', () => {
    it('forwards string id to service', () => {
      controller.findOne(objectId);
      expect(service.findOne).toHaveBeenCalledWith(objectId);
    });
  });

  describe('update', () => {
    it('forwards id and dto to service.update', async () => {
      const dto: UpdateFenceDto = {};
      const expected = { id: objectId };
      service.update.mockResolvedValue(expected as never);

      const result = await controller.update(objectId, dto);

      expect(service.update).toHaveBeenCalledWith(objectId, dto);
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('forwards id to service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(objectId);

      expect(service.remove).toHaveBeenCalledWith(objectId);
    });
  });
});
