import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AsrService } from '../asr/asr.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import type { AnalyzeVoiceDto } from './dto/analyze-voice.dto';

type FlavorTagRecord = {
  name: string;
  aiWeight?: number | string | { toString(): string };
};

const FLAVOR_ALIAS_MAP: Record<string, string[]> = {
  '果香甜润': ['果香', '果味', '果甜', '甜润', '果香甜感'],
  '木质烟草': ['木质', '木香', '雪松', '雪松木', '烟草', '烟叶', '木香烟草'],
  '泥土矿物': ['泥土', '矿物', '土壤', '矿石', '泥土感'],
  '咖啡可可': ['咖啡', '可可', '黑巧克力', '巧克力', '烘焙', '咖啡豆'],
  '辛香胡椒': ['辛香', '辛辣', '胡椒', '白胡椒', '黑胡椒', '香料'],
  '奶油丝滑': ['奶油', '丝滑', '顺滑', '绵柔', '奶香'],
  '皮革木桶': ['皮革', '木桶', '橡木桶', '桶香', '皮革感'],
  '花香清雅': ['花香', '花感', '花调', '清雅', '清香'],
  '坚果焦糖': ['坚果', '焦糖', '杏仁', '榛子', '焦糖甜感'],
  '香草甜美': ['香草', '甜美', '甜感', '香甜', '奶甜'],
  '泥炭烟熏': ['泥炭', '烟熏', '烟燻', '熏烤', '炭感'],
  '雪松丝绸': ['雪松', '雪松木', '木香', '丝绸', '丝滑', '绸感'],
};

const FLAVOR_KEYWORD_GROUPS = [
  ['果香', '果味', '果甜'],
  ['甜润', '甜感', '甜美', '香甜'],
  ['木质', '木香', '雪松', '雪松木'],
  ['烟草', '烟叶'],
  ['泥土', '土壤'],
  ['矿物', '矿石'],
  ['咖啡', '咖啡豆'],
  ['可可', '巧克力', '黑巧克力'],
  ['辛香', '辛辣', '香料'],
  ['胡椒', '白胡椒', '黑胡椒'],
  ['奶油', '奶香'],
  ['丝滑', '顺滑', '绵柔', '丝绸'],
  ['皮革', '皮革感'],
  ['木桶', '橡木桶', '桶香'],
  ['花香', '花感', '花调', '清雅'],
  ['坚果', '杏仁', '榛子'],
  ['焦糖'],
  ['香草'],
  ['泥炭'],
  ['烟熏', '烟燻', '熏烤'],
];

const DEV_FALLBACK_TAGS: Array<{ name: string; category: string; aiWeight: number }> = [
  { name: '木质烟草', category: '木香系', aiWeight: 0.9 },
  { name: '咖啡可可', category: '咖啡系', aiWeight: 0.85 },
  { name: '奶油丝滑', category: '奶香系', aiWeight: 0.8 },
  { name: '皮革木桶', category: '皮革系', aiWeight: 0.7 },
  { name: '辛香胡椒', category: '辛香系', aiWeight: 0.75 },
  { name: '雪松丝绸', category: '木香系', aiWeight: 0.7 },
];

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
    const trimmedText = dto.text?.trim();

    // 文字模式：跳过 ASR，直接提取风味
    if (trimmedText && !dto.audioBase64) {
      const { tags, scores } = await this.extractFlavorsFromText(trimmedText, dto.cigarId);
      return {
        voiceText: trimmedText,
        flavorTags: tags,
        flavorScores: scores,
      };
    }

    // 语音模式：ASR 转文字 → 提取风味
    if (dto.audioBase64) {
      if (isMock) {
        return this.mockAnalyze(dto.cigarId);
      }

      const format = dto.audioFormat ?? 'mp3';
      let asrResult;
      try {
        asrResult = await this.asrService.recognizeSentence(dto.audioBase64, format);
      } catch (error) {
        if (this.shouldAllowDevFallback()) {
          return this.mockAnalyze(dto.cigarId);
        }
        throw error;
      }
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

    if (dto.text && !trimmedText) {
      throw new BadRequestException('文字描述不能为空');
    }

    throw new BadRequestException('请提供 audioBase64（语音）或 text（文字）');
  }

  /** 从文字中提取风味关键词 */
  private async extractFlavorsFromText(
    text: string,
    cigarId?: number,
  ): Promise<{ tags: string[]; scores: Record<string, number> }> {
    const normalizedText = this.normalizeText(text);
    let allTags: Array<FlavorTagRecord & { name: string }>;
    try {
      allTags = await this.prisma.flavorTag.findMany({
        where: { enabled: true },
      });
    } catch (error) {
      if (this.shouldAllowDevFallback()) {
        return this.extractFlavorsFromLocalText(text, cigarId);
      }
      throw error;
    }

    const matchedTags = allTags
      .map((tag) => ({
        tag,
        matchScore: this.matchTagScore(normalizedText, tag.name),
      }))
      .filter((item) => item.matchScore >= 60)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return this.getAiWeight(b.tag) - this.getAiWeight(a.tag);
      });

    const selected = [...matchedTags];

    // 若匹配不足 3 个且提供了 cigarId，补充该雪茄的标签
    if (cigarId && selected.length < 3) {
      try {
        const cigarTags = await this.prisma.cigarTag.findMany({
          where: { cigarId: BigInt(cigarId) },
          include: { tag: true },
        });
        const existing = new Set(selected.map((item) => item.tag.name));
        for (const ct of cigarTags) {
          if (!existing.has(ct.tag.name)) {
            selected.push({ tag: ct.tag, matchScore: 55 });
            existing.add(ct.tag.name);
          }
        }
      } catch (error) {
        if (!this.shouldAllowDevFallback()) {
          throw error;
        }
      }

      selected.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return this.getAiWeight(b.tag) - this.getAiWeight(a.tag);
      });
    }

    // 取前 5 个，按 aiWeight 计算分数
    const top = selected.slice(0, 5);
    const scores: Record<string, number> = {};
    for (const item of top) {
      scores[item.tag.name] = this.buildFlavorScore(item.tag, item.matchScore);
    }

    return { tags: top.map((item) => item.tag.name), scores };
  }

  /** Mock 模式：从数据库标签生成模拟风味数据 */
  private async mockAnalyze(cigarId?: number) {
    let tags: Array<FlavorTagRecord & { name: string }> = [];
    if (cigarId) {
      try {
        const cigarTags = await this.prisma.cigarTag.findMany({
          where: { cigarId: BigInt(cigarId) },
          include: { tag: true },
        });
        tags = cigarTags.map((ct) => ct.tag);
      } catch (error) {
        if (!this.shouldAllowDevFallback()) {
          throw error;
        }
        tags = [...DEV_FALLBACK_TAGS];
      }
    }

    if (tags.length === 0) {
      try {
        tags = await this.prisma.flavorTag.findMany({
          where: { enabled: true },
          orderBy: { aiWeight: 'desc' },
          take: 5,
        });
      } catch (error) {
        if (!this.shouldAllowDevFallback()) {
          throw error;
        }
        tags = [...DEV_FALLBACK_TAGS];
      }
    }
    tags = tags.slice(0, 5);

    const scores: Record<string, number> = {};
    for (const tag of tags) {
      scores[tag.name] = this.buildFlavorScore(tag, 70);
    }

    return {
      voiceText: `模拟识别到的风味关键词：${tags.map((tag) => tag.name).slice(0, 3).join('、')}`,
      flavorTags: tags.map((tag) => tag.name),
      flavorScores: scores,
      note: 'Mock 模式，接入腾讯云 ASR 后返回真实识别结果',
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
  }

  private getAiWeight(tag: FlavorTagRecord): number {
    const value = Number(tag.aiWeight ?? 0.65);
    return Number.isFinite(value) ? value : 0.65;
  }

  private buildFlavorScore(tag: FlavorTagRecord, matchScore: number): number {
    const weighted = Math.round(this.getAiWeight(tag) * 100);
    return Math.max(60, Math.min(99, Math.round(weighted * 0.6 + matchScore * 0.4)));
  }

  private buildTagAliases(tagName: string): string[] {
    const aliases = new Set<string>([tagName, ...(FLAVOR_ALIAS_MAP[tagName] ?? [])]);
    for (const group of FLAVOR_KEYWORD_GROUPS) {
      if (group.some((keyword) => tagName.includes(keyword))) {
        group.forEach((keyword) => aliases.add(keyword));
      }
    }
    return [...aliases];
  }

  private matchTagScore(normalizedText: string, tagName: string): number {
    const normalizedTag = this.normalizeText(tagName);
    if (!normalizedText || !normalizedTag) return 0;

    if (normalizedText.includes(normalizedTag)) {
      return 100;
    }

    let best = 0;
    const aliases = this.buildTagAliases(tagName);
    for (const alias of aliases) {
      const normalizedAlias = this.normalizeText(alias);
      if (!normalizedAlias) continue;

      if (normalizedText.includes(normalizedAlias)) {
        best = Math.max(best, normalizedAlias === normalizedTag ? 100 : 88);
        continue;
      }

      const distance = this.findBestWindowDistance(normalizedText, normalizedAlias);
      if (distance <= 1) {
        best = Math.max(best, 78);
      } else if (distance === 2 && normalizedAlias.length >= 4) {
        best = Math.max(best, 68);
      }
    }

    const keywordHits = FLAVOR_KEYWORD_GROUPS
      .filter((group) => group.some((keyword) => tagName.includes(keyword)))
      .filter((group) => group.some((keyword) => normalizedText.includes(this.normalizeText(keyword))))
      .length;

    if (keywordHits >= 2) {
      best = Math.max(best, 84);
    } else if (keywordHits === 1) {
      best = Math.max(best, 62);
    }

    return best;
  }

  private findBestWindowDistance(text: string, target: string): number {
    if (!text || !target) return Number.POSITIVE_INFINITY;

    let best = Number.POSITIVE_INFINITY;
    const minLen = Math.max(1, target.length - 1);
    const maxLen = Math.min(text.length, target.length + 1);
    for (let start = 0; start < text.length; start += 1) {
      for (let len = minLen; len <= maxLen; len += 1) {
        const chunk = text.slice(start, start + len);
        if (!chunk) continue;
        best = Math.min(best, this.levenshteinDistance(chunk, target));
        if (best === 0) return 0;
      }
    }
    return best;
  }

  private levenshteinDistance(source: string, target: string): number {
    const rows = source.length + 1;
    const cols = target.length + 1;
    const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

    for (let i = 0; i < rows; i += 1) dp[i][0] = i;
    for (let j = 0; j < cols; j += 1) dp[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = source[i - 1] === target[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[source.length][target.length];
  }

  private shouldAllowDevFallback(): boolean {
    const explicit = this.config.get<string>('DEV_DATA_FALLBACK', '');
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;

    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    return nodeEnv !== 'production';
  }

  private extractFlavorsFromLocalText(
    text: string,
    _cigarId?: number,
  ): { tags: string[]; scores: Record<string, number> } {
    const normalizedText = this.normalizeText(text);
    const matched = DEV_FALLBACK_TAGS
      .map((tag) => ({
        tag,
        matchScore: this.matchTagScore(normalizedText, tag.name),
      }))
      .filter((item) => item.matchScore >= 60)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return this.getAiWeight(b.tag) - this.getAiWeight(a.tag);
      });

    const top = (matched.length > 0 ? matched : DEV_FALLBACK_TAGS.map((tag) => ({ tag, matchScore: 70 }))).slice(0, 5);
    const scores: Record<string, number> = {};
    for (const item of top) {
      scores[item.tag.name] = this.buildFlavorScore(item.tag, item.matchScore);
    }

    return { tags: top.map((item) => item.tag.name), scores };
  }

  /** 获取公开风味标签列表 */
  async getFlavorTags() {
    let tags: Array<{ id?: bigint; name: string; category: string }>;
    try {
      tags = await this.prisma.flavorTag.findMany({
        where: { enabled: true },
        orderBy: { category: 'asc' },
      });
    } catch (error) {
      if (!this.shouldAllowDevFallback()) {
        throw error;
      }
      tags = DEV_FALLBACK_TAGS;
    }

    return {
      tags: tags.map((t) => ({
        id: t.id ? t.id.toString() : t.name,
        name: t.name,
        category: t.category,
      })),
      categories: [...new Set(tags.map((t) => t.category))],
    };
  }
}
