import { Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizePagination,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto.js';
import { buildPaginatedResult } from '../common/pagination/pagination.types.js';
import type { PaginatedResult } from '../common/pagination/pagination.types.js';
import { DeviceRepository } from './device.repository.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import { Device } from './entities/device.entity.js';

@Injectable()
export class DeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  create(dto: CreateDeviceDto): Promise<Device> {
    return this.deviceRepository.create(dto);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Device>> {
    const { page, limit } = normalizePagination(query);
    const { items, total } = await this.deviceRepository.findPage(page, limit);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.deviceRepository.update(id, dto);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.deviceRepository.remove(id);
    if (!deleted) {
      throw new NotFoundException(`Device ${id} not found`);
    }
  }
}
