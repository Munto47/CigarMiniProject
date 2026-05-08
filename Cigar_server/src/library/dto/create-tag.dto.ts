import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: '标签名称' })
  @IsString() @IsNotEmpty() @MaxLength(32)
  name: string;

  @ApiPropertyOptional({ description: '标签分类' })
  @IsOptional() @IsString() @MaxLength(32)
  category?: string;

  @ApiPropertyOptional({ description: 'AI 权重 (0-1)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1)
  aiWeight?: number;

  @ApiPropertyOptional({ description: '评分映射' })
  @IsOptional() @IsObject()
  scoreMap?: Record<string, number>;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional() @IsBoolean()
  enabled?: boolean;
}
