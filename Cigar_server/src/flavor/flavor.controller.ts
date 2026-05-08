import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FlavorService } from './flavor.service';
import { AnalyzeVoiceDto } from './dto/analyze-voice.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('flavor')
@Controller('flavor')
export class FlavorController {
  constructor(private readonly flavorService: FlavorService) {}

  @Post('analyze-voice')
  @ApiOperation({ summary: '语音风味分析' })
  @ApiBearerAuth()
  async analyzeVoice(@Body() dto: AnalyzeVoiceDto) {
    return this.flavorService.analyzeVoice(dto.voiceUrl, dto.cigarId);
  }

  @Get('tags')
  @ApiOperation({ summary: '获取风味标签列表' })
  @Public()
  async getTags() {
    return this.flavorService.getFlavorTags();
  }
}
