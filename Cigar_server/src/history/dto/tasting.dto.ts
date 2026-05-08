import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsInt, IsString, IsObject } from 'class-validator';

export class CreateTastingDto {
  @ApiPropertyOptional({ description: '雪茄ID（可空，未知雪茄时存储风味数据即可）' })
  @IsOptional()
  @IsInt()
  cigarId?: number;

  @ApiProperty({ description: '风味标签列表', example: ['木香', '咖啡'] })
  @IsArray()
  @IsString({ each: true })
  flavorTags: string[];

  @ApiPropertyOptional({ description: '风味评分 map' })
  @IsOptional()
  @IsObject()
  flavorScores?: Record<string, number>;

  @ApiProperty({ description: '数据来源', enum: ['manual', 'voice', 'ai'] })
  @IsString()
  source: string;
}
