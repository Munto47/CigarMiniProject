import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { centsToYuan } from '../common/utils/money';
import type { AnswerItem } from './dto/recommend.dto';

// 雪茄推荐数据集缓存 5 分钟，商品变更时由 product.service 主动失效
const CIGAR_CACHE_KEY = 'recommend:cigars:active';
const CIGAR_CACHE_TTL = 300;

type CachedCigar = Awaited<ReturnType<RecommendService['loadActiveCigars']>>[number];

@Injectable()
export class RecommendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 规则引擎推荐
   * 1. 根据用户答案确定风味偏好向量
   * 2. 对每支在售雪茄，基于 cigar_tags + flavor_tags.score_map 计算得分
   * 3. 按得分降序排列
   */
  async recommend(answers: AnswerItem[], limit: number, userId?: bigint) {
    // 1. 收集用户偏好的风味关键词权重
    const flavorWeights = new Map<string, number>();
    const questions = await this.prisma.recommendQuestion.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });

    for (const a of answers) {
      const q = questions.find((q) => q.id === BigInt(a.questionId));
      if (!q) continue;
      const opts = q.options as any[];
      if (!opts || !opts[a.optionIndex]) continue;
      const selected = opts[a.optionIndex];
      if (selected.flavorWeights) {
        for (const [key, val] of Object.entries(selected.flavorWeights as Record<string, number>)) {
          flavorWeights.set(key, (flavorWeights.get(key) ?? 0) + val);
        }
      }
    }

    if (flavorWeights.size === 0) {
      return this.fallbackRecommend(limit);
    }

    // 2. 获取在售雪茄（优先走 Redis 缓存，避免每次全量 JOIN）
    const cigars = await this.getCachedActiveCigars();

    // 3. 计算每支雪茄的得分
    const scored = cigars.map((cigar) => {
      let score = 0;
      const matchedTags: string[] = [];

      for (const ct of cigar.cigarTags) {
        const tag = ct.tag;
        if (!tag.enabled) continue;

        const scoreMap = tag.scoreMap as Record<string, number>;
        for (const [flavorKey, weight] of flavorWeights) {
          if (scoreMap[flavorKey]) {
            score += scoreMap[flavorKey] * weight;
            if (!matchedTags.includes(tag.name)) {
              matchedTags.push(tag.name);
            }
          }
        }
      }

      return { cigar, score, matchedTags };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).filter((s) => s.score > 0);

    const maxScore = top.length > 0 ? top[0].score : 1;
    const toMatchPct = (score: number) =>
      Math.min(100, Math.max(40, Math.round((score / maxScore) * 95)));

    // 4. 记录推荐日志（异步，不阻塞响应）
    if (userId) {
      this.prisma.recommendLog
        .create({
          data: {
            userId,
            answers: JSON.parse(JSON.stringify(answers)),
            resultCigars: JSON.parse(
              JSON.stringify(
                top.map((s) => ({ id: s.cigar.id.toString(), name: s.cigar.name, score: s.score })),
              ),
            ),
          },
        })
        .catch(() => {});
    }

    return {
      total: top.length,
      fallback: false,
      answers,
      list: top.map((s) => this.formatCigar(s.cigar, toMatchPct(s.score), s.matchedTags)),
    };
  }

  /** 获取推荐问题列表 */
  async getQuestions() {
    const questions = await this.prisma.recommendQuestion.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });

    return {
      questions: questions.map((q) => ({
        id: q.id.toString(),
        position: q.position,
        title: q.title,
        multi: q.multi,
        options: q.options,
      })),
    };
  }

  /** 商品变更时主动失效缓存 */
  async invalidateCigarCache() {
    await this.redis.del(CIGAR_CACHE_KEY);
  }

  // ── 私有方法 ─────────────────────────────────────────────────────

  private async getCachedActiveCigars(): Promise<CachedCigar[]> {
    const cached = await this.redis.get(CIGAR_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached, (_, v) => v);
    }

    const cigars = await this.loadActiveCigars();

    // bigint 序列化为 string 存 Redis
    const serialized = JSON.stringify(cigars, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    await this.redis.set(CIGAR_CACHE_KEY, serialized, CIGAR_CACHE_TTL);

    return cigars;
  }

  private async loadActiveCigars() {
    return this.prisma.cigar.findMany({
      where: { status: 'active', deletedAt: null },
      include: {
        cigarTags: { include: { tag: true } },
        reviews: {
          where: { status: 'visible', deletedAt: null },
          select: { rating: true },
        },
        pairings: {
          include: { drink: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  private async fallbackRecommend(limit: number) {
    const cigars = await this.prisma.cigar.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
      take: limit,
    });

    return {
      total: cigars.length,
      fallback: true,
      list: cigars.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        brand: c.brand,
        spec: c.spec,
        strength: c.strength,
        flavorStart: c.flavorStart,
        flavorMid: c.flavorMid,
        flavorEnd: c.flavorEnd,
        scenes: c.scenes,
        priceCents: c.priceCents.toString(),
        priceYuan: centsToYuan(c.priceCents),
        memberPriceCents: c.memberPriceCents.toString(),
        memberPriceYuan: centsToYuan(c.memberPriceCents),
        thumbUrl: c.thumbUrl,
        ratingAvg: c.ratingAvg.toString(),
        ratingCount: c.ratingCount,
      })),
    };
  }

  private formatCigar(cigar: CachedCigar, matchPct: number, matchTags: string[]) {
    const priceCents = typeof cigar.priceCents === 'bigint'
      ? cigar.priceCents
      : BigInt(cigar.priceCents as string);
    const memberPriceCents = typeof cigar.memberPriceCents === 'bigint'
      ? cigar.memberPriceCents
      : BigInt(cigar.memberPriceCents as string);

    return {
      id: cigar.id.toString(),
      name: cigar.name,
      brand: cigar.brand,
      spec: cigar.spec,
      strength: cigar.strength,
      flavorStart: cigar.flavorStart,
      flavorMid: cigar.flavorMid,
      flavorEnd: cigar.flavorEnd,
      scenes: cigar.scenes,
      priceCents: priceCents.toString(),
      priceYuan: centsToYuan(priceCents),
      memberPriceCents: memberPriceCents.toString(),
      memberPriceYuan: centsToYuan(memberPriceCents),
      thumbUrl: cigar.thumbUrl,
      ratingAvg: cigar.ratingAvg.toString(),
      ratingCount: cigar.ratingCount,
      matchPct,
      matchTags,
      pairings: (cigar as any).pairings?.map((p: any) => {
        const drinkMemberPrice = typeof p.drink.memberPriceCents === 'bigint'
          ? p.drink.memberPriceCents
          : BigInt(p.drink.memberPriceCents as string);
        const drinkPrice = typeof p.drink.priceCents === 'bigint'
          ? p.drink.priceCents
          : BigInt(p.drink.priceCents as string);
        return {
          id: p.drink.id.toString(),
          name: p.drink.name,
          categoryCode: p.drink.categoryCode,
          priceYuan: Number(drinkMemberPrice || drinkPrice) / 100,
          memberPriceCents: drinkMemberPrice.toString(),
          priceCents: drinkPrice.toString(),
          thumbUrl: p.drink.thumbUrl,
          description: p.description ?? p.drink.description ?? null,
          stockAvailable: p.drink.stock - p.drink.stockLocked,
        };
      }) ?? [],
    };
  }
}
