import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstoreDto {
  @ApiProperty({ description: '雪茄名称' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: '品牌' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  brand: string;

  @ApiProperty({ description: '分类代码' })
  @IsString() @IsNotEmpty()
  categoryCode: string;

  @ApiPropertyOptional({ description: '浓度' })
  @IsOptional() @IsString() @MaxLength(32)
  strength?: string;

  @ApiPropertyOptional({ description: '前段风味' })
  @IsOptional() @IsString()
  flavorStart?: string;

  @ApiPropertyOptional({ description: '中段风味' })
  @IsOptional() @IsString()
  flavorMid?: string;

  @ApiPropertyOptional({ description: '后段风味' })
  @IsOptional() @IsString()
  flavorEnd?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional() @IsString()
  remark?: string;
}
