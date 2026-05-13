import { Test, TestingModule } from '@nestjs/testing';
import { FenceController } from './fence.controller';
import { FenceService } from './fence.service';
import { CreateFenceDto } from './dto/create-fence.dto';
import { UpdateFenceDto } from './dto/update-fence.dto';

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
    it('forwards dto and returns service result by reference (no transform)', () => {
      const expected = { id: 'fence_1' };
      service.create.mockReturnValue(expected as unknown as string);

      const result = controller.create(baseCreateDto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(baseCreateDto);
      expect(result).toBe(expected);
    });

    it('propagates service errors', () => {
      const err = new Error('boom');
      service.create.mockImplementation(() => {
        throw err;
      });

      expect(() => controller.create(baseCreateDto)).toThrow(err);
    });
  });

  describe('findAll', () => {
    it('calls service.findAll with no args and returns result by reference', () => {
      const expected = [{ id: 'fence_1' }, { id: 'fence_2' }];
      service.findAll.mockReturnValue(expected as unknown as string);

      const result = controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('findOne', () => {
    it.each<[string, number]>([
      ['1', 1],
      ['42', 42],
      ['0', 0],
    ])('casts id %p to number %p before calling service', (input, parsed) => {
      controller.findOne(input);
      expect(service.findOne).toHaveBeenCalledWith(parsed);
    });

    it('passes NaN to service for non-numeric id (documents current behavior)', () => {
      controller.findOne('abc');
      const arg = service.findOne.mock.calls[0][0];
      expect(Number.isNaN(arg)).toBe(true);
    });

    it('returns service result by reference', () => {
      const expected = { id: 42 };
      service.findOne.mockReturnValue(expected as unknown as string);

      expect(controller.findOne('42')).toBe(expected);
    });
  });

  describe('update', () => {
    it('casts id and forwards dto to service.update', () => {
      const dto: UpdateFenceDto = {};
      const expected = { id: 7 };
      service.update.mockReturnValue(expected as unknown as string);

      const result = controller.update('7', dto);

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(7, dto);
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('casts id and forwards to service.remove', () => {
      const expected = { deleted: true };
      service.remove.mockReturnValue(expected as unknown as string);

      const result = controller.remove('9');

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(9);
      expect(result).toBe(expected);
    });
  });

  it('does not invoke unrelated service methods on findAll', () => {
    controller.findAll();

    expect(service.create).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
});
