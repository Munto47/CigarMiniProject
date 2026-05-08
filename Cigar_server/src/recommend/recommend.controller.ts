import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendService } from './recommend.service';
import { RecommendDto } from './dto/recommend.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('recommend')
@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  @ApiOperation({ summary: 'AI 推荐（规则引擎）' })
  @ApiBearerAuth()
  async recommend(
    @CurrentUser() user: { sub: string },
    @Body() dto: RecommendDto,
  ) {
    return this.recommendService.recommend(dto.answers, dto.limit ?? 10, BigInt(user.sub));
  }

  @Get('questions')
  @ApiOperation({ summary: '获取推荐问题列表' })
  @Public()
  async getQuestions() {
    return this.recommendService.getQuestions();
  }
}
