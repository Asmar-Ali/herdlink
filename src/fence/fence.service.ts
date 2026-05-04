import { Injectable } from '@nestjs/common';
import { CreateFenceDto } from './dto/create-fence.dto';
import { UpdateFenceDto } from './dto/update-fence.dto';

@Injectable()
export class FenceService {
  create(createFenceDto: CreateFenceDto) {
    return 'This action adds a new fence';
  }

  findAll() {
    return `This action returns all fence`;
  }

  findOne(id: number) {
    return `This action returns a #${id} fence`;
  }

  update(id: number, updateFenceDto: UpdateFenceDto) {
    return `This action updates a #${id} fence`;
  }

  remove(id: number) {
    return `This action removes a #${id} fence`;
  }
}
