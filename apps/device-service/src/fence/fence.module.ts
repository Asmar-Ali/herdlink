import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FenceController } from './fence.controller';
import { FenceService } from './fence.service';
import { Geofence, GeofenceSchema } from './entities/fence.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Geofence.name, schema: GeofenceSchema },
    ]),
  ],
  controllers: [FenceController],
  providers: [FenceService],
})
export class FenceModule {}
