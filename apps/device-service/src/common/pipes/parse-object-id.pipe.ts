import { BadRequestException, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates route params as 24-char hex MongoDB ObjectIds.
 * Rejects values that pass isValid() but are not canonical (e.g. 12-byte strings).
 */
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (
      !Types.ObjectId.isValid(value) ||
      new Types.ObjectId(value).toString() !== value
    ) {
      throw new BadRequestException(`Invalid id '${value}'`);
    }
    return value;
  }
}
