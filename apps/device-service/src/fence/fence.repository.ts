import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateFenceDto } from './dto/create-fence.dto.js';
import { UpdateFenceDto } from './dto/update-fence.dto.js';
import {
  BreachDirection,
  Geofence,
  GeofenceDocument,
} from './entities/fence.entity.js';
import { assertValidPolygon } from './fence-geometry.js';
import type { FenceResponse } from './fence.types.js';

@Injectable()
export class FenceRepository {
  constructor(
    @InjectModel(Geofence.name)
    private readonly geofenceModel: Model<GeofenceDocument>,
  ) {}

  async create(dto: CreateFenceDto): Promise<FenceResponse> {
    assertValidPolygon(dto.geometry);

    const doc = await this.geofenceModel.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      breachDirection: dto.breachDirection ?? BreachDirection.BOTH,
      geometry: dto.geometry,
      active: dto.active ?? true,
      herdIds: dto.herdIds ?? [],
      alertCooldownSeconds: dto.alertCooldownSeconds ?? 300,
      severity: dto.severity ?? 'MEDIUM',
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    return this.toResponse(doc);
  }

  count(): Promise<number> {
    return this.geofenceModel.countDocuments().exec();
  }

  async bulkCreate(dtos: CreateFenceDto[]): Promise<number> {
    if (dtos.length === 0) {
      return 0;
    }

    for (const dto of dtos) {
      assertValidPolygon(dto.geometry);
    }

    const docs = await this.geofenceModel.insertMany(
      dtos.map((dto) => ({
        name: dto.name,
        description: dto.description,
        type: dto.type,
        breachDirection: dto.breachDirection ?? BreachDirection.BOTH,
        geometry: dto.geometry,
        active: dto.active ?? true,
        herdIds: dto.herdIds ?? [],
        alertCooldownSeconds: dto.alertCooldownSeconds ?? 300,
        severity: dto.severity ?? 'MEDIUM',
        metadata: dto.metadata ?? {},
        createdBy: dto.createdBy,
      })),
    );

    return docs.length;
  }

  async findAll(): Promise<FenceResponse[]> {
    const docs = await this.geofenceModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toResponse(doc));
  }

  async findById(id: string): Promise<FenceResponse | null> {
    const doc = await this.geofenceModel.findById(id).exec();
    return doc ? this.toResponse(doc) : null;
  }

  async update(
    id: string,
    dto: UpdateFenceDto,
  ): Promise<FenceResponse | null> {
    if (dto.geometry) {
      assertValidPolygon(dto.geometry);
    }

    const patch: Partial<Geofence> & { updatedBy?: string } = { ...dto };
    if (dto.updatedBy !== undefined) {
      patch.updatedBy = dto.updatedBy;
    }

    const doc = await this.geofenceModel
      .findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    return doc ? this.toResponse(doc) : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.geofenceModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  private toResponse(doc: GeofenceDocument): FenceResponse {
    const obj = doc.toObject();
    const id =
      obj._id instanceof Types.ObjectId
        ? obj._id.toString()
        : String(obj._id);

    return {
      id,
      name: obj.name,
      description: obj.description,
      type: obj.type,
      breachDirection: obj.breachDirection,
      geometry: obj.geometry,
      active: obj.active,
      herdIds: obj.herdIds,
      alertCooldownSeconds: obj.alertCooldownSeconds,
      severity: obj.severity,
      metadata: obj.metadata ?? {},
      createdBy: obj.createdBy,
      updatedBy: obj.updatedBy,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}
