import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class AnalyzeVoiceDto {
  @ApiPropertyOptional({ description: '语音文件 URL（COS 路径）' })
  @IsOptional()
  @IsString()
  voiceUrl?: string;

  @ApiPropertyOptional({ description: '关联雪茄ID' })
  @IsOptional()
  @IsInt()
  cigarId?: number;
}
