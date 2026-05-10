import { DeviceStatus, DeviceType } from '../entities/device.entity';

export class CreateDeviceDto {
  serialNumber: string;
  name: string;
  type?: DeviceType;
  status?: DeviceStatus;
  herdId?: string | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastSeenAt?: Date | null;
  batteryLevel?: number | null;
  metadata?: Record<string, unknown>;
}
