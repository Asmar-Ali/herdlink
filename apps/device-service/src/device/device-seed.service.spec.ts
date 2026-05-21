import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSeedService } from './device-seed.service';
import { DeviceRepository } from './device.repository';

describe('DeviceSeedService', () => {
  let service: DeviceSeedService;
  let repo: jest.Mocked<Pick<DeviceRepository, 'count' | 'bulkCreate'>>;

  const configValues: Record<string, string> = {
    NODE_ENV: 'development',
    SEED_DEVICES: 'true',
    SEED_DEVICE_COUNT: '1000',
    SEED_DEVICE_PREFIX: 'SIM-',
  };

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceSeedService,
        {
          provide: DeviceRepository,
          useValue: repo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string) =>
                configValues[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(DeviceSeedService);
  });

  afterEach(() => jest.clearAllMocks());

  it('seeds when dev, flag on, and table is empty', async () => {
    repo.count.mockResolvedValue(0);
    repo.bulkCreate.mockResolvedValue(1000);

    await service.onModuleInit();

    expect(repo.bulkCreate).toHaveBeenCalledTimes(1);
    expect(repo.bulkCreate.mock.calls[0][0]).toHaveLength(1000);
    expect(repo.bulkCreate.mock.calls[0][0][0]).toEqual({
      serialNumber: 'SIM-000001',
      name: 'Simulated Cow 1',
      herdId: 'herd-demo-1',
    });
    expect(repo.bulkCreate.mock.calls[0][0][999]).toEqual({
      serialNumber: 'SIM-001000',
      name: 'Simulated Cow 1000',
      herdId: 'herd-demo-10',
    });
  });

  it('skips when not development', async () => {
    configValues.NODE_ENV = 'production';

    await service.onModuleInit();

    expect(repo.count).not.toHaveBeenCalled();
    configValues.NODE_ENV = 'development';
  });

  it('skips when SEED_DEVICES is not true', async () => {
    configValues.SEED_DEVICES = 'false';

    await service.onModuleInit();

    expect(repo.count).not.toHaveBeenCalled();
    configValues.SEED_DEVICES = 'true';
  });

  it('skips when devices already exist', async () => {
    repo.count.mockResolvedValue(3);

    await service.onModuleInit();

    expect(repo.bulkCreate).not.toHaveBeenCalled();
  });
});
