import { Test, TestingModule } from '@nestjs/testing';
import { FenceController } from './fence.controller';
import { FenceService } from './fence.service';

describe('FenceController', () => {
  let controller: FenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FenceController],
      providers: [FenceService],
    }).compile();

    controller = module.get<FenceController>(FenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
