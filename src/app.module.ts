import { Module } from '@nestjs/common';
import { DeviceModule } from './device/device.module';
import { FenceModule } from './fence/fence.module';

@Module({
  imports: [DeviceModule, FenceModule],
})
export class AppModule {}

