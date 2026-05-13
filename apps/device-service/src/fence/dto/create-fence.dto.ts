import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BreachDirection, GeofenceType } from '../entities/fence.entity.js';

export class GeoJSONPolygonDto {
  @Equals('Polygon')
  type: 'Polygon';

  /**
   * GeoJSON: array of linear rings of [longitude, latitude] pairs.
   * class-validator can only enforce shape down to one level; the deeper
   * numeric/ring-closure checks live in the service layer.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsArray({ each: true })
  coordinates: number[][][];
}

export class CreateFenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(GeofenceType)
  type: GeofenceType;

  @IsOptional()
  @IsEnum(BreachDirection)
  breachDirection?: BreachDirection;

  @ValidateNested()
  @Type(() => GeoJSONPolygonDto)
  geometry: GeoJSONPolygonDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  herdIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  alertCooldownSeconds?: number;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  createdBy?: string;
}
