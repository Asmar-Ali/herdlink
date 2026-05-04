// apps/device-service/src/devices/entities/device.entity.ts

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
  } from 'typeorm';
  
  export enum DeviceStatus {
    ACTIVE = 'ACTIVE',         // healthy, sending telemetry
    INACTIVE = 'INACTIVE',     // registered but not yet provisioned
    DECOMMISSIONED = 'DECOMMISSIONED', // permanently retired
    LOST = 'LOST',             // hasn't reported in > N hours
  }
  
  export enum DeviceType {
    COLLAR_V1 = 'COLLAR_V1',
    COLLAR_V2 = 'COLLAR_V2',
  }
  
  @Entity({ name: 'devices' })
  @Index(['status'])
  @Index(['herdId'])
  export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // Hardware-level identifier — what the physical (or simulated) collar reports as.
    // Unique, immutable, separate from the internal id.
    @Column({ type: 'varchar', length: 64, unique: true })
    @Index()
    serialNumber: string;
  
    // Human-friendly label set by the farm operator.
    // e.g. "Cow #142", "Bessie", "Pen-3-Tag-7"
    @Column({ type: 'varchar', length: 120 })
    name: string;
  
    @Column({ type: 'enum', enum: DeviceType, default: DeviceType.COLLAR_V1 })
    type: DeviceType;
  
    @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.INACTIVE })
    status: DeviceStatus;
  
    // Logical grouping — a herd, paddock cohort, or farm zone.
    // Nullable because a freshly registered device may not be assigned yet.
    @Column({ type: 'uuid', nullable: true })
    herdId: string | null;
  
    // Last known position — denormalised here for fast "list devices with last position" queries
    // without round-tripping to Redis or TimescaleDB. Updated by the ingestion-service.
    // Nullable until the device first reports.
    @Column({ type: 'double precision', nullable: true })
    lastLatitude: number | null;
  
    @Column({ type: 'double precision', nullable: true })
    lastLongitude: number | null;
  
    @Column({ type: 'timestamptz', nullable: true })
    lastSeenAt: Date | null;
  
    // Latest battery reading (0–100). Denormalised for the same reason as last position.
    @Column({ type: 'smallint', nullable: true })
    batteryLevel: number | null;
  
    // Free-form configuration overrides (sample rate, alert thresholds, etc.).
    // JSONB on Postgres — searchable but flexible.
    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, unknown>;
  
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
  
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
  }