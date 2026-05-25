import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';

export class AnalyzeVoiceDto {
  @ApiPropertyOptional({ description: 'Base64 编码的音频数据' })
  @IsOptional()
  @IsString()
  audioBase64?: string;

  @ApiPropertyOptional({ description: '音频格式 (mp3/wav/pcm/m4a/aac)' })
  @IsOptional()
  @IsString()
  @IsIn(['mp3', 'wav', 'pcm', 'm4a', 'aac'])
  audioFormat?: string;

  @ApiPropertyOptional({ description: '文字描述（跳过 ASR，直接提取风味）' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: '关联雪茄ID' })
  @IsOptional()
  @IsInt()
  cigarId?: number;
}
