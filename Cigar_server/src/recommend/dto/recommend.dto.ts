import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsInt } from 'class-validator';

export class RecommendDto {
  @ApiProperty({ description: '用户答案 [{questionId, optionIndex}]' })
  @IsArray()
  answers: AnswerItem[];

  @ApiPropertyOptional({ description: '返回数量', default: 10 })
  @IsOptional()
  @IsInt()
  limit?: number = 10;
}

export interface AnswerItem {
  questionId: number;
  optionIndex: number;
}
