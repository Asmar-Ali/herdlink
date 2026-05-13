import {
  IsDate,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceStatus, DeviceType } from '../entities/device.entity.js';

export class CreateDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  serialNumber: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(128)
  herdId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsLatitude()
  lastLatitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsLongitude()
  lastLongitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  lastSeenAt?: Date | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
