import { Module } from '@nestjs/common';
import { FenceService } from './fence.service';
import { FenceController } from './fence.controller';

@Module({
  controllers: [FenceController],
  providers: [FenceService],
})
export class FenceModule {}
