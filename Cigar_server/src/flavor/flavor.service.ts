import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FlavorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** 语音风味分析（一期 Mock 模式） */
  async analyzeVoice(voiceUrl?: string, cigarId?: number) {
    const isMock = this.config.get<string>('VOICE_ASR_MOCK', 'true') === 'true';

    if (isMock) {
      return this.mockAnalyze(cigarId);
    }

    // TODO: 二期接入腾讯云 ASR
    throw new BusinessException(ErrorCode.UPSTREAM_AI_ERROR, '语音分析服务暂未接入');
  }

  private async mockAnalyze(cigarId?: number) {
    // 如果传了 cigarId，直接用其标签返回
    let tags: string[] = [];
    if (cigarId) {
      const cigarTags = await this.prisma.cigarTag.findMany({
        where: { cigarId: BigInt(cigarId) },
        include: { tag: true },
      });
      tags = cigarTags.map(ct => ct.tag.name);
    }

    if (tags.length === 0) {
      // 随机返回一些常见风味
      const allTags = await this.prisma.flavorTag.findMany({
        where: { enabled: true },
        take: 5,
      });
      tags = allTags.map(t => t.name);
    }

    const scores: Record<string, number> = {};
    for (const t of tags) {
      scores[t] = Math.round((Math.random() * 50 + 50) * 100) / 100; // 50-100
    }

    return {
      voiceText: null, // mock 模式无语音转文本
      flavorTags: tags,
      flavorScores: scores,
      note: 'Mock 模式，接入腾讯云 ASR 后返回真实识别结果',
    };
  }

  /** 获取公开风味标签列表 */
  async getFlavorTags() {
    const tags = await this.prisma.flavorTag.findMany({
      where: { enabled: true },
      orderBy: { category: 'asc' },
    });

    return {
      tags: tags.map(t => ({
        id: t.id.toString(),
        name: t.name,
        category: t.category,
      })),
      categories: [...new Set(tags.map(t => t.category))],
    };
  }
}
