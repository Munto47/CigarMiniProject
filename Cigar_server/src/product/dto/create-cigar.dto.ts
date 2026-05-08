import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean,
  IsArray, IsObject, MaxLength, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCigarDto {
  @ApiProperty({ description: '雪茄名称' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: '品牌' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  brand: string;

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional() @IsString() @MaxLength(64)
  model?: string;

  @ApiPropertyOptional({ description: '规格', default: '单支' })
  @IsOptional() @IsString() @MaxLength(32)
  spec?: string;

  @ApiProperty({ description: '分类代码' })
  @IsString() @IsNotEmpty()
  categoryCode: string;

  @ApiPropertyOptional({ description: '产地' })
  @IsOptional() @IsString() @MaxLength(64)
  origin?: string;

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional() @IsString() @MaxLength(16)
  year?: string;

  @ApiPropertyOptional({ description: '茄衣' })
  @IsOptional() @IsString() @MaxLength(64)
  wrapper?: string;

  @ApiPropertyOptional({ description: '浓度' })
  @IsOptional() @IsString() @MaxLength(32)
  strength?: string;

  @ApiPropertyOptional({ description: '时长' })
  @IsOptional() @IsString() @MaxLength(32)
  duration?: string;

  @ApiProperty({ description: '价格（分）' })
  @Type(() => Number) @IsNumber() @Min(1)
  priceCents: number;

  @ApiProperty({ description: '会员价格（分）' })
  @Type(() => Number) @IsNumber() @Min(1)
  memberPriceCents: number;

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '前段风味' })
  @IsOptional() @IsString()
  flavorStart?: string;

  @ApiPropertyOptional({ description: '中段风味' })
  @IsOptional() @IsString()
  flavorMid?: string;

  @ApiPropertyOptional({ description: '后段风味' })
  @IsOptional() @IsString()
  flavorEnd?: string;

  @ApiPropertyOptional({ description: '风味评分' })
  @IsOptional() @IsObject()
  flavorScores?: Record<string, number>;

  @ApiPropertyOptional({ description: '场景标签' })
  @IsOptional() @IsArray() @IsString({ each: true })
  scenes?: string[];

  @ApiPropertyOptional({ description: '价格段' })
  @IsOptional() @IsObject()
  segments?: object;

  @ApiPropertyOptional({ description: '主图 URL' })
  @IsOptional() @IsString()
  heroImageUrl?: string;

  @ApiPropertyOptional({ description: '缩略图 URL' })
  @IsOptional() @IsString()
  thumbUrl?: string;

  @ApiPropertyOptional({ description: '是否新品' })
  @IsOptional() @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ description: '关联标签 ID 列表' })
  @IsOptional() @IsArray() @Type(() => Number) @IsInt({ each: true })
  tagIds?: number[];
}
