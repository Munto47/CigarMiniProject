import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrinkDto {
  @ApiProperty({ description: '饮品名称' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: '分类代码' })
  @IsString() @IsNotEmpty()
  categoryCode: string;

  @ApiProperty({ description: '价格（分）' })
  @Type(() => Number) @IsNumber() @Min(1)
  priceCents: number;

  @ApiProperty({ description: '会员价格（分）' })
  @Type(() => Number) @IsNumber() @Min(1)
  memberPriceCents: number;

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '缩略图 URL' })
  @IsOptional() @IsString()
  thumbUrl?: string;

  @ApiPropertyOptional({ description: '是否新品' })
  @IsOptional() @IsBoolean()
  isNew?: boolean;
}
