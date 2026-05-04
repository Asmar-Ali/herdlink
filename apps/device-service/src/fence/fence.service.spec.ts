import { Test, TestingModule } from '@nestjs/testing';
import { FenceService } from './fence.service';

describe('FenceService', () => {
  let service: FenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FenceService],
    }).compile();

    service = module.get<FenceService>(FenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
