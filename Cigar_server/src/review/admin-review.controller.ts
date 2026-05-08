import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { QueryReviewDto } from './dto/query-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
export class AdminReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: '评价列表' })
  @RequirePermissions('review:read')
  async listReviews(@Query() query: QueryReviewDto) {
    return this.reviewService.listReviews(query.page ?? 1, query.pageSize ?? 20, query.status);
  }

  @Put(':id/moderate')
  @ApiOperation({ summary: '审核评价（visible/hidden）' })
  @RequirePermissions('review:moderate')
  async moderateReview(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewService.moderateReview(Number(id), dto.status, BigInt(admin.sub));
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除评价' })
  @RequirePermissions('review:delete')
  async deleteReview(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.reviewService.deleteReview(Number(id), BigInt(admin.sub));
  }

  // ── 敏感词管理 ──

  @Get('sensitive-words')
  @ApiOperation({ summary: '敏感词列表' })
  @RequirePermissions('review:moderate')
  async listSensitiveWords(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.reviewService.listSensitiveWords(page ?? 1, pageSize ?? 20);
  }

  @Post('sensitive-words')
  @ApiOperation({ summary: '添加敏感词' })
  @RequirePermissions('review:moderate')
  async addSensitiveWord(
    @CurrentUser() admin: any,
    @Body() body: { word: string },
  ) {
    if (!body.word) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '敏感词不能为空');
    }
    return this.reviewService.createSensitiveWord(body.word, BigInt(admin.sub));
  }

  @Delete('sensitive-words/:id')
  @ApiOperation({ summary: '删除敏感词' })
  @RequirePermissions('review:moderate')
  async deleteSensitiveWord(@Param('id') id: string) {
    return this.reviewService.deleteSensitiveWord(Number(id));
  }

  @Put('sensitive-words/:id/toggle')
  @ApiOperation({ summary: '启用/禁用敏感词' })
  @RequirePermissions('review:moderate')
  async toggleSensitiveWord(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.reviewService.toggleSensitiveWord(Number(id), body.enabled);
  }
}
