import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceController } from './device.controller';
import { DeviceRepository } from './device.repository';
import { DeviceSeedService } from './device-seed.service';
import { DeviceService } from './device.service';
import { Device } from './entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository, DeviceSeedService],
})
export class DeviceModule {}
