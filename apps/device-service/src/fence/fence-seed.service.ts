import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildDemoInclusionFences } from './fence-seed.data.js';
import { FenceRepository } from './fence.repository.js';

@Injectable()
export class FenceSeedService implements OnModuleInit {
  private readonly logger = new Logger(FenceSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly fenceRepository: FenceRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') !== 'development') {
      return;
    }

    if (this.config.get<string>('SEED_DEVICES') !== 'true') {
      return;
    }

    const existing = await this.fenceRepository.count();
    if (existing > 0) {
      this.logger.log(
        `Skipping fence seed: ${existing} geofence(s) already in database`,
      );
      return;
    }

    const fences = buildDemoInclusionFences();
    const inserted = await this.fenceRepository.bulkCreate(fences);
    this.logger.log(`Seeded ${inserted} inclusion fences (demo paddocks)`);
  }
}
