import { PartialType } from '@nestjs/swagger';
import { CreateInstoreDto } from './create-instore.dto';

export class UpdateInstoreDto extends PartialType(CreateInstoreDto) {}
