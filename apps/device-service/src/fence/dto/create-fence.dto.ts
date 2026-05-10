import { BreachDirection, GeofenceType } from '../entities/fence.entity';

export class CreateFenceDto {
  name: string;
  description?: string;
  type: GeofenceType;
  breachDirection?: BreachDirection;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  active?: boolean;
  herdIds?: string[];
  alertCooldownSeconds?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
  createdBy?: string;
}
