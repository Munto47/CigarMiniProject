import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateInstoreDto } from './create-instore.dto';

export class SyncInstoreDto {
  @ApiProperty({ description: '同步数据', type: [CreateInstoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstoreDto)
  items: CreateInstoreDto[];
}
