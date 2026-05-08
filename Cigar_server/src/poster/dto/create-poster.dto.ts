import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsInt, IsString, IsObject } from 'class-validator';

export class CreatePosterDto {
  @ApiPropertyOptional({ description: '关联雪茄ID' })
  @IsOptional()
  @IsInt()
  cigarId?: number;

  @ApiPropertyOptional({ description: '语音识别文本' })
  @IsOptional()
  @IsString()
  voiceText?: string;

  @ApiProperty({ description: '风味标签列表', example: ['木香', '咖啡'] })
  @IsArray()
  @IsString({ each: true })
  flavorTags: string[];

  @ApiPropertyOptional({ description: '风味评分' })
  @IsOptional()
  @IsObject()
  flavorScores?: Record<string, number>;
}
