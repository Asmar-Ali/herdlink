import type {
  BreachDirection,
  GeofenceType,
} from './entities/fence.entity.js';

export interface FenceResponse {
  id: string;
  name: string;
  description?: string;
  type: GeofenceType;
  breachDirection: BreachDirection;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  active: boolean;
  herdIds: string[];
  alertCooldownSeconds: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
