import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceRepository } from './device.repository.js';

@Injectable()
export class DeviceSeedService implements OnModuleInit {
  private readonly logger = new Logger(DeviceSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') !== 'development') {
      return;
    }

    if (this.config.get<string>('SEED_DEVICES') !== 'true') {
      return;
    }

    const existing = await this.deviceRepository.count();
    if (existing > 0) {
      this.logger.log(
        `Skipping device seed: ${existing} device(s) already in database`,
      );
      return;
    }

    const count = parseInt(
      this.config.get<string>('SEED_DEVICE_COUNT', '1000'),
      10,
    );
    if (!Number.isFinite(count) || count < 1) {
      this.logger.warn(
        `Invalid SEED_DEVICE_COUNT "${this.config.get('SEED_DEVICE_COUNT')}"; skipping seed`,
      );
      return;
    }

    const prefix = this.config.get<string>('SEED_DEVICE_PREFIX', 'SIM-');
    const rows = Array.from({ length: count }, (_, index) => {
      const n = index + 1;
      return {
        serialNumber: `${prefix}${String(n).padStart(6, '0')}`,
        name: `Simulated Cow ${n}`,
        herdId: `herd-demo-${((n - 1) % 10) + 1}`,
      };
    });

    const inserted = await this.deviceRepository.bulkCreate(rows);
    this.logger.log(`Seeded ${inserted} devices (${prefix}*)`);
  }
}
