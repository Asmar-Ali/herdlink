import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GeofenceType } from './entities/fence.entity.js';
import { buildDemoInclusionFences } from './fence-seed.data.js';
import { FenceSeedService } from './fence-seed.service.js';
import { FenceRepository } from './fence.repository.js';

describe('FenceSeedService', () => {
  let service: FenceSeedService;
  let repo: jest.Mocked<Pick<FenceRepository, 'count' | 'bulkCreate'>>;

  const configValues: Record<string, string> = {
    NODE_ENV: 'development',
    SEED_DEVICES: 'true',
  };

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FenceSeedService,
        { provide: FenceRepository, useValue: repo },
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

    service = module.get(FenceSeedService);
  });

  afterEach(() => jest.clearAllMocks());

  it('seeds 10 inclusion fences when dev, flag on, and collection is empty', async () => {
    repo.count.mockResolvedValue(0);
    repo.bulkCreate.mockResolvedValue(10);

    await service.onModuleInit();

    expect(repo.bulkCreate).toHaveBeenCalledWith(buildDemoInclusionFences());
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

  it('skips when geofences already exist', async () => {
    repo.count.mockResolvedValue(2);
    await service.onModuleInit();
    expect(repo.bulkCreate).not.toHaveBeenCalled();
  });
});

describe('buildDemoInclusionFences', () => {
  it('returns 10 inclusion paddocks scoped to herd-demo-1..10', () => {
    const fences = buildDemoInclusionFences();
    expect(fences).toHaveLength(10);
    expect(fences.every((f) => f.type === GeofenceType.INCLUSION)).toBe(true);
    expect(fences[0].herdIds).toEqual(['herd-demo-1']);
    expect(fences[9].herdIds).toEqual(['herd-demo-10']);
  });
});
