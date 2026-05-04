import { PartialType } from '@nestjs/mapped-types';
import { CreateFenceDto } from './create-fence.dto';

export class UpdateFenceDto extends PartialType(CreateFenceDto) {}
