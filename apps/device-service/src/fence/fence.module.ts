import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Geofence, GeofenceSchema } from './entities/fence.entity.js';
import { FenceController } from './fence.controller.js';
import { FenceRepository } from './fence.repository.js';
import { FenceSeedService } from './fence-seed.service.js';
import { FenceService } from './fence.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Geofence.name, schema: GeofenceSchema },
    ]),
  ],
  controllers: [FenceController],
  providers: [FenceService, FenceRepository, FenceSeedService],
})
export class FenceModule {}
