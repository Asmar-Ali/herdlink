import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Version
} from '@nestjs/common';
import { FenceService } from './fence.service';
import { CreateFenceDto } from './dto/create-fence.dto';
import { UpdateFenceDto } from './dto/update-fence.dto';

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
  findOne(@Param('id') id: string) {
    return this.fenceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFenceDto: UpdateFenceDto) {
    return this.fenceService.update(+id, updateFenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fenceService.remove(+id);
  }
}
