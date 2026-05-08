import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosterService } from './poster.service';
import { CreatePosterDto } from './dto/create-poster.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('posters')
@ApiBearerAuth()
@Controller('posters')
export class PosterController {
  constructor(private readonly posterService: PosterService) {}

  @Post()
  @ApiOperation({ summary: '生成海报' })
  async createPoster(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreatePosterDto,
  ) {
    return this.posterService.createPoster(BigInt(user.sub), {
      cigarId: dto.cigarId,
      voiceText: dto.voiceText,
      flavorTags: dto.flavorTags,
      flavorScores: dto.flavorScores,
    });
  }

  @Get()
  @ApiOperation({ summary: '获取当前用户海报列表' })
  async listMyPosters(
    @CurrentUser() user: { sub: string },
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.posterService.listMyPosters(BigInt(user.sub), Number(page), Number(pageSize));
  }

  @Get(':id')
  @ApiOperation({ summary: '获取海报详情' })
  async getPoster(@Param('id') id: string) {
    return this.posterService.getPoster(Number(id));
  }
}
