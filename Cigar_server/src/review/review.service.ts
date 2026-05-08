import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { toBeijing } from '../common/utils/time';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /** 检查内容是否含敏感词 */
  async filterSensitiveWords(content: string): Promise<boolean> {
    const words = await this.prisma.sensitiveWord.findMany({
      where: { enabled: true },
      select: { word: true },
    });
    return words.some(w => content.includes(w.word));
  }

  /** 用户提交评价 */
  async createReview(
    userId: bigint,
    cigarId: number,
    orderId: number | undefined,
    rating: number,
    content: string,
  ) {
    // 提供订单ID时校验订单归属与状态
    if (orderId != null) {
      const order = await this.prisma.order.findFirst({
        where: { id: BigInt(orderId), userId, status: { in: ['completed', 'paid'] } },
        select: { id: true, status: true },
      });
      if (!order) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_FORBIDDEN, '订单不属于你或未支付/未完成');
      }

      const orderItem = await this.prisma.orderItem.findFirst({
        where: { orderId: BigInt(orderId), productId: BigInt(cigarId), productType: 'cigar' },
      });
      if (!orderItem) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '该订单未包含此雪茄');
      }
    }

    // 每位用户对每支雪茄只能评价一次
    const existing = await this.prisma.review.findUnique({
      where: { userId_cigarId: { userId, cigarId: BigInt(cigarId) } },
    });
    if (existing) {
      throw new BusinessException(ErrorCode.ALREADY_REVIEWED, '您已评价过此雪茄');
    }

    // 敏感词过滤
    const hasSensitive = await this.filterSensitiveWords(content);
    const status = hasSensitive ? 'pending' : 'visible';

    // 获取会员等级快照
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { rechargeLevel: true, consumptionLevel: true },
    });

    const review = await this.prisma.review.create({
      data: {
        userId,
        cigarId: BigInt(cigarId),
        orderId: orderId != null ? BigInt(orderId) : null,
        rating,
        content,
        status,
        rechargeLevelSnap: profile?.rechargeLevel ?? 1,
        consumptionLevelSnap: profile?.consumptionLevel ?? 1,
      },
    });

    // 同步雪茄评分
    await this.syncCigarRating(BigInt(cigarId));

    return {
      id: review.id.toString(),
      status: review.status,
      hint: hasSensitive ? '评论含敏感词，待管理员审核后展示' : null,
    };
  }

  /** 获取雪茄评价列表（公开，仅可见的） */
  async getCigarReviews(cigarId: number, page: number, pageSize: number) {
    const where = { cigarId: BigInt(cigarId), status: 'visible' };
    const [list, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        select: {
          id: true,
          userId: true,
          rating: true,
          content: true,
          rechargeLevelSnap: true,
          consumptionLevelSnap: true,
          createdAt: true,
          user: { select: { nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      list: list.map(r => ({
        id: r.id.toString(),
        userId: r.userId.toString(),
        nickname: r.user.nickname,
        avatarUrl: r.user.avatarUrl,
        rating: r.rating,
        content: r.content,
        rechargeLevel: r.rechargeLevelSnap,
        consumptionLevel: r.consumptionLevelSnap,
        createdAt: toBeijing(r.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 管理端：审核评价（visible/hidden） */
  async moderateReview(reviewId: number, status: 'visible' | 'hidden', adminId: bigint) {
    const review = await this.prisma.review.findUnique({ where: { id: BigInt(reviewId) } });
    if (!review) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '评价不存在');
    }

    await this.prisma.review.update({
      where: { id: BigInt(reviewId) },
      data: { status, reviewedByAdminId: adminId, reviewedAt: new Date() },
    });

    await this.syncCigarRating(review.cigarId);

    return { id: reviewId, status };
  }

  /** 管理端：删除评价（软删除） */
  async deleteReview(reviewId: number, adminId: bigint) {
    const review = await this.prisma.review.findUnique({ where: { id: BigInt(reviewId) } });
    if (!review) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '评价不存在');
    }

    await this.prisma.review.update({
      where: { id: BigInt(reviewId) },
      data: { deletedAt: new Date(), reviewedByAdminId: adminId, reviewedAt: new Date() },
    });

    await this.syncCigarRating(review.cigarId);

    return { id: reviewId, deleted: true };
  }

  /** 管理端：评论列表（含评分总览） */
  async listReviews(page: number, pageSize: number, status?: string) {
    const where: any = { deletedAt: null };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [list, total, cigarGroups] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { nickname: true } },
          cigar: { select: { name: true } },
          order: { select: { orderNo: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
      // 按雪茄维度汇总评分（前端评分总览按雪茄展示）
      this.prisma.review.groupBy({
        by: ['cigarId'],
        where: { deletedAt: null },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // 查询雪茄名称
    const cigarIds = cigarGroups.map(g => g.cigarId);
    const cigars = cigarIds.length > 0
      ? await this.prisma.cigar.findMany({ where: { id: { in: cigarIds } }, select: { id: true, name: true } })
      : [];
    const cigarMap = new Map(cigars.map(c => [c.id.toString(), c.name]));

    const ratingSummary = cigarGroups
      .sort((a, b) => (b._avg.rating ?? 0) - (a._avg.rating ?? 0))
      .map(g => ({
        cigarId: g.cigarId.toString(),
        cigarName: cigarMap.get(g.cigarId.toString()) ?? '未知雪茄',
        avgRating: Math.round((g._avg.rating ?? 0) * 10) / 10,
        count: g._count.rating,
      }));

    return {
      list: list.map(r => ({
        id: r.id.toString(),
        userId: r.userId.toString(),
        nickname: r.user.nickname,
        cigarId: r.cigarId.toString(),
        cigarName: r.cigar.name,
        orderNo: r.order?.orderNo ?? null,
        rating: r.rating,
        content: r.content,
        status: r.status,
        createdAt: toBeijing(r.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      ratingSummary,
    };
  }

  /** 同步雪茄评分（由可见评价重新计算） */
  private async syncCigarRating(cigarId: bigint) {
    const agg = await this.prisma.review.aggregate({
      where: { cigarId, status: 'visible', deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.cigar.update({
      where: { id: cigarId },
      data: {
        ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0,
        ratingCount: agg._count.rating,
      },
    });
  }

  /** 敏感词 CRUD */
  async listSensitiveWords(page: number, pageSize: number) {
    const [list, total] = await Promise.all([
      this.prisma.sensitiveWord.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sensitiveWord.count(),
    ]);

    return {
      list: list.map(w => ({
        id: w.id.toString(),
        word: w.word,
        enabled: w.enabled,
        createdAt: toBeijing(w.createdAt),
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createSensitiveWord(word: string, adminId: bigint) {
    const existing = await this.prisma.sensitiveWord.findUnique({ where: { word } });
    if (existing) {
      throw new BusinessException(ErrorCode.BUSINESS_CONFLICT, '该敏感词已存在');
    }
    const r = await this.prisma.sensitiveWord.create({
      data: { word, createdBy: adminId },
    });
    return { id: r.id.toString(), word: r.word };
  }

  async deleteSensitiveWord(id: number) {
    await this.prisma.sensitiveWord.delete({ where: { id: BigInt(id) } });
    return { id, deleted: true };
  }

  async toggleSensitiveWord(id: number, enabled: boolean) {
    await this.prisma.sensitiveWord.update({
      where: { id: BigInt(id) },
      data: { enabled },
    });
    return { id, enabled };
  }
}
