import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: '雪茄ID' })
  @IsInt()
  cigarId: number;

  @ApiPropertyOptional({ description: '订单ID（关联购买订单，可选）' })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty({ description: '评分 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: '评价内容' })
  @IsString()
  @MaxLength(2000)
  content: string;
}
