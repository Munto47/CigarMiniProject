import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { CreateTastingDto } from './dto/tasting.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('history')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: '获取品鉴历史记录' })
  async getHistory(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.historyService.getHistory(BigInt(user.sub), page ?? 1, pageSize ?? 20);
  }

  @Post('tasting')
  @ApiOperation({ summary: '记录品鉴' })
  async createTasting(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateTastingDto,
  ) {
    return this.historyService.createTasting(
      BigInt(user.sub),
      dto.cigarId ?? null,
      dto.flavorTags,
      dto.flavorScores ?? null,
      dto.source,
    );
  }
}
