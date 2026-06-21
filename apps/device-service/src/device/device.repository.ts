import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  isPgError,
  PgErrorCode,
} from '../common/database/postgres-error-codes.js';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Device, DeviceStatus, DeviceType } from './entities/device.entity.js';

@Injectable()
export class DeviceRepository {
  constructor(
    @InjectDataSource()
    readonly dataSource: DataSource,
  ) {}

  private get repo(): Repository<Device> {
    return this.dataSource.getRepository(Device);
  }

  async create(input: DeepPartial<Device>): Promise<Device> {
    try {
      const row = this.repo.create({
        type: DeviceType.COLLAR_V1,
        status: DeviceStatus.INACTIVE,
        ...input,
        metadata: input.metadata ?? {},
      });
      return await this.repo.save(row);
    } catch (err) {
      if (isPgError(err)) {
        if (err.code === PgErrorCode.UNIQUE_VIOLATION) {
          throw new ConflictException(
            `A device with serial number '${input.serialNumber as string}' already exists`,
          );
        }
        if (err.code === PgErrorCode.CHECK_VIOLATION) {
          throw new UnprocessableEntityException(
            `Device data violates a database constraint: ${err.constraint ?? 'unknown'}`,
          );
        }
      }
      throw err;
    }
  }

  count(): Promise<number> {
    return this.repo.count();
  }

  /**
   * Batch insert for dev seeding. Does not run per-row conflict handling;
   * callers must ensure the table is empty or serials are unique.
   */
  async bulkCreate(inputs: DeepPartial<Device>[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const CHUNK_SIZE = 250;
    let inserted = 0;

    for (let offset = 0; offset < inputs.length; offset += CHUNK_SIZE) {
      const entities = inputs
        .slice(offset, offset + CHUNK_SIZE)
        .map((input) =>
          this.repo.create({
            type: DeviceType.COLLAR_V1,
            status: DeviceStatus.INACTIVE,
            metadata: input.metadata ?? {},
            ...input,
          }),
        );

      const saved = await this.repo.save(entities);
      inserted += saved.length;
    }

    return inserted;
  }

  async findPage(
    page: number,
    limit: number,
  ): Promise<{ items: Device[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total };
  }

  findById(id: string): Promise<Device | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, patch: DeepPartial<Device>): Promise<Device | null> {
    const device = await this.findById(id);
    if (!device) {
      return null;
    }

    if (
      device.status === DeviceStatus.ACTIVE &&
      patch.status === DeviceStatus.DECOMMISSIONED
    ) {
      throw new UnprocessableEntityException(
        `Cannot decommission device '${id}' while it is ACTIVE. Set it to INACTIVE first.`,
      );
    }

    try {
      this.repo.merge(device, patch);
      return await this.repo.save(device);
    } catch (err) {
      if (isPgError(err)) {
        if (err.code === PgErrorCode.UNIQUE_VIOLATION) {
          throw new ConflictException(
            `A device with that serial number already exists`,
          );
        }
        if (err.code === PgErrorCode.CHECK_VIOLATION) {
          throw new UnprocessableEntityException(
            `Update violates a database constraint: ${err.constraint ?? 'unknown'}`,
          );
        }
      }
      throw err;
    }
  }

  async remove(id: string): Promise<boolean> {
    const device = await this.findById(id);

    if (device?.status === DeviceStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        `Cannot delete device '${id}' while it is ACTIVE. Decommission it first.`,
      );
    }

    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
