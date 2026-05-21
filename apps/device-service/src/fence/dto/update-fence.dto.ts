import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateFenceDto } from './create-fence.dto.js';

export class UpdateFenceDto extends PartialType(CreateFenceDto) {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  updatedBy?: string;
}
