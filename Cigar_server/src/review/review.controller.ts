import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('reviews')
  @ApiOperation({ summary: '提交评价' })
  async createReview(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(
      BigInt(user.sub),
      dto.cigarId,
      dto.orderId,
      dto.rating,
      dto.content,
    );
  }

  @Get('cigars/:id/reviews')
  @ApiOperation({ summary: '获取雪茄评价列表' })
  async getCigarReviews(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.reviewService.getCigarReviews(Number(id), page ?? 1, pageSize ?? 20);
  }
}
