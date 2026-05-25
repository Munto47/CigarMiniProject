import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AsrService } from '../asr/asr.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import type { AnalyzeVoiceDto } from './dto/analyze-voice.dto';

@Injectable()
export class FlavorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly asrService: AsrService,
  ) {}

  /** 语音/文字风味分析 */
  async analyzeVoice(dto: AnalyzeVoiceDto) {
    const isMock = this.config.get<string>('VOICE_ASR_MOCK', 'true') === 'true';

    // Mock 模式：直接返回模拟数据
    if (isMock) {
      return this.mockAnalyze(dto.cigarId);
    }

    // 文字模式：跳过 ASR，直接提取风味
    if (dto.text && !dto.audioBase64) {
      const { tags, scores } = await this.extractFlavorsFromText(dto.text, dto.cigarId);
      return {
        voiceText: dto.text,
        flavorTags: tags,
        flavorScores: scores,
      };
    }

    // 语音模式：ASR 转文字 → 提取风味
    if (dto.audioBase64) {
      const format = dto.audioFormat ?? 'mp3';
      const asrResult = await this.asrService.recognizeSentence(dto.audioBase64, format);
      const voiceText = asrResult.text;

      if (!voiceText) {
        throw new BusinessException(ErrorCode.UPSTREAM_AI_ERROR, '语音识别未返回文字内容');
      }

      const { tags, scores } = await this.extractFlavorsFromText(voiceText, dto.cigarId);
      return {
        voiceText,
        flavorTags: tags,
        flavorScores: scores,
        audioDuration: asrResult.audioDuration,
      };
    }

    throw new BadRequestException('请提供 audioBase64（语音）或 text（文字）');
  }

  /** 从文字中提取风味关键词 */
  private async extractFlavorsFromText(
    text: string,
    cigarId?: number,
  ): Promise<{ tags: string[]; scores: Record<string, number> }> {
    const allTags = await this.prisma.flavorTag.findMany({
      where: { enabled: true },
    });

    const matchedTags = allTags.filter((tag) => text.includes(tag.name));

    // 若匹配不足 3 个且提供了 cigarId，补充该雪茄的标签
    if (cigarId && matchedTags.length < 3) {
      const cigarTags = await this.prisma.cigarTag.findMany({
        where: { cigarId: BigInt(cigarId) },
        include: { tag: true },
      });
      const existing = new Set(matchedTags.map((t) => t.name));
      for (const ct of cigarTags) {
        if (!existing.has(ct.tag.name)) {
          matchedTags.push(ct.tag);
          existing.add(ct.tag.name);
        }
      }
    }

    // 取前 5 个，按 aiWeight 计算分数
    const top = matchedTags.slice(0, 5);
    const scores: Record<string, number> = {};
    for (const tag of top) {
      const baseScore = Number(tag.aiWeight) * 100;
      scores[tag.name] = Math.round(Math.min(100, baseScore + Math.random() * 20));
    }

    return { tags: top.map((t) => t.name), scores };
  }

  /** Mock 模式：从数据库标签生成模拟风味数据 */
  private async mockAnalyze(cigarId?: number) {
    let tags: string[] = [];
    if (cigarId) {
      const cigarTags = await this.prisma.cigarTag.findMany({
        where: { cigarId: BigInt(cigarId) },
        include: { tag: true },
      });
      tags = cigarTags.map((ct) => ct.tag.name);
    }

    if (tags.length === 0) {
      const allTags = await this.prisma.flavorTag.findMany({
        where: { enabled: true },
        take: 5,
      });
      tags = allTags.map((t) => t.name);
    }

    const scores: Record<string, number> = {};
    for (const t of tags) {
      scores[t] = Math.round((Math.random() * 50 + 50) * 100) / 100;
    }

    return {
      voiceText: null,
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
      tags: tags.map((t) => ({
        id: t.id.toString(),
        name: t.name,
        category: t.category,
      })),
      categories: [...new Set(tags.map((t) => t.category))],
    };
  }
}
