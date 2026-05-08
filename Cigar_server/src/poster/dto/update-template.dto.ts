import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'LOGO 图片 URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '背景色' })
  @IsOptional()
  @IsString()
  bgColor?: string;

  @ApiPropertyOptional({ description: '强调色' })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({ description: '字体风格' })
  @IsOptional()
  @IsString()
  fontStyle?: string;

  @ApiPropertyOptional({ description: '俱乐部名称' })
  @IsOptional()
  @IsString()
  clubName?: string;

  @ApiPropertyOptional({ description: '标语' })
  @IsOptional()
  @IsString()
  tagline?: string;
}
