import { DeviceType, DeviceStatus } from '../entities/device.entity';

export class CreateDeviceDto {
    serialNumber: string;
    name: string;
    type: DeviceType;
    status: DeviceStatus;
    herdId: string;
    lastLatitude: number;
    lastLongitude: number;
    lastSeenAt: Date;
    batteryLevel: number;
    metadata: Record<string, unknown>;
}
