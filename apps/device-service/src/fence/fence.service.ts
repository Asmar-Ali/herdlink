import { Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizePagination,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto.js';
import { buildPaginatedResult } from '../common/pagination/pagination.types.js';
import type { PaginatedResult } from '../common/pagination/pagination.types.js';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { UpdateFenceDto } from './dto/update-fence.dto.js';
import { FenceRepository } from './fence.repository.js';
import type { FenceResponse } from './fence.types.js';

@Injectable()
export class FenceService {
  constructor(private readonly fenceRepository: FenceRepository) {}

  create(dto: CreateFenceDto): Promise<FenceResponse> {
    return this.fenceRepository.create(dto);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<FenceResponse>> {
    const { page, limit } = normalizePagination(query);
    const { items, total } = await this.fenceRepository.findPage(page, limit);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(id: string): Promise<FenceResponse> {
    const fence = await this.fenceRepository.findById(id);
    if (!fence) {
      throw new NotFoundException(`Fence ${id} not found`);
    }
    return fence;
  }

  async update(id: string, dto: UpdateFenceDto): Promise<FenceResponse> {
    const fence = await this.fenceRepository.update(id, dto);
    if (!fence) {
      throw new NotFoundException(`Fence ${id} not found`);
    }
    return fence;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.fenceRepository.remove(id);
    if (!deleted) {
      throw new NotFoundException(`Fence ${id} not found`);
    }
  }
}
