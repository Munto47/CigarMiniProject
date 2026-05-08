import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import type { AnswerItem } from './dto/recommend.dto';

@Injectable()
export class RecommendService {
  constructor(private readonly prisma: PrismaService) {}

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
      const q = questions.find(q => q.id === BigInt(a.questionId));
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

    // 如果没有任何风味权重，返回热门雪茄
    if (flavorWeights.size === 0) {
      return this.fallbackRecommend(limit);
    }

    // 2. 获取所有在售雪茄及其标签和配饮
    const cigars = await this.prisma.cigar.findMany({
      where: { status: 'active', deletedAt: null },
      include: {
        cigarTags: { include: { tag: true } },
        reviews: { where: { status: 'visible', deletedAt: null }, select: { rating: true } },
        pairings: {
          include: { drink: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // 3. 计算每支雪茄的得分
    const scored = cigars.map(cigar => {
      let score = 0;
      const matchedTags: string[] = [];

      for (const ct of cigar.cigarTags) {
        const tag = ct.tag;
        if (!tag.enabled) continue;

        // 基于 score_map 匹配用户风味偏好
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

      return {
        cigar,
        score,
        matchedTags,
      };
    });

    // 按得分降序，取前 limit
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).filter(s => s.score > 0);

    // 归一化：最高得分映射到 95%，其余等比缩放，下限 40%，上限 100%
    const maxScore = top.length > 0 ? top[0].score : 1;
    const toMatchPct = (score: number) =>
      Math.min(100, Math.max(40, Math.round((score / maxScore) * 95)));

    // 4. 记录推荐日志
    if (userId) {
      await this.prisma.recommendLog.create({
        data: {
          userId,
          answers: JSON.parse(JSON.stringify(answers)),
          resultCigars: JSON.parse(JSON.stringify(top.map(s => ({
            id: s.cigar.id.toString(),
            name: s.cigar.name,
            score: s.score,
          })))),
        },
      });
    }

    // 5. 格式化返回
    return {
      total: top.length,
      fallback: false,
      answers,
      list: top.map(s => ({
        id: s.cigar.id.toString(),
        name: s.cigar.name,
        brand: s.cigar.brand,
        spec: s.cigar.spec,
        strength: s.cigar.strength,
        flavorStart: s.cigar.flavorStart,
        flavorMid: s.cigar.flavorMid,
        flavorEnd: s.cigar.flavorEnd,
        scenes: s.cigar.scenes,
        priceCents: s.cigar.priceCents.toString(),
        priceYuan: centsToYuan(s.cigar.priceCents),
        memberPriceCents: s.cigar.memberPriceCents.toString(),
        memberPriceYuan: centsToYuan(s.cigar.memberPriceCents),
        thumbUrl: s.cigar.thumbUrl,
        ratingAvg: s.cigar.ratingAvg.toString(),
        ratingCount: s.cigar.ratingCount,
        matchPct: toMatchPct(s.score),
        matchTags: s.matchedTags,
        pairings: (s.cigar as any).pairings?.map((p: any) => ({
          id: p.drink.id.toString(),
          name: p.drink.name,
          categoryCode: p.drink.categoryCode,
          priceYuan: Number(p.drink.memberPriceCents || p.drink.priceCents) / 100,
          memberPriceCents: p.drink.memberPriceCents.toString(),
          priceCents: p.drink.priceCents.toString(),
          thumbUrl: p.drink.thumbUrl,
          description: p.description ?? p.drink.description ?? null,
          stockAvailable: p.drink.stock - p.drink.stockLocked,
        })) ?? [],
      })),
    };
  }

  /** 无偏好时回退：返回评分最高的雪茄 */
  private async fallbackRecommend(limit: number) {
    const cigars = await this.prisma.cigar.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
      take: limit,
    });

    return {
      total: cigars.length,
      fallback: true,
      list: cigars.map(c => ({
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

  /** 获取推荐问题列表 */
  async getQuestions() {
    const questions = await this.prisma.recommendQuestion.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
    });

    return {
      questions: questions.map(q => ({
        id: q.id.toString(),
        position: q.position,
        title: q.title,
        multi: q.multi,
        options: q.options,
      })),
    };
  }
}
