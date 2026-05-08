import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ description: '审核状态', enum: ['visible', 'hidden'] })
  @IsString()
  @IsIn(['visible', 'hidden'])
  status: 'visible' | 'hidden';
}
