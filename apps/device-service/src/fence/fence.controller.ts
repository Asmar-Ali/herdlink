import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { UpdateFenceDto } from './dto/update-fence.dto.js';
import { FenceService } from './fence.service.js';

@Controller({ path: 'fence', version: '1' })
export class FenceController {
  constructor(private readonly fenceService: FenceService) {}

  @Post()
  create(@Body() createFenceDto: CreateFenceDto) {
    return this.fenceService.create(createFenceDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.fenceService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.fenceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateFenceDto: UpdateFenceDto,
  ) {
    return this.fenceService.update(id, updateFenceDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.fenceService.remove(id);
  }
}
