import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
  findAll() {
    return this.fenceService.findAll();
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
