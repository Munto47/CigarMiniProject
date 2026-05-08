import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { toBeijing } from '../common/utils/time';

@Injectable()
export class PosterService {
  constructor(private readonly prisma: PrismaService) {}

  /** 生成海报记录 */
  async createPoster(
    userId: bigint,
    data: {
      cigarId?: number;
      voiceText?: string;
      flavorTags: string[];
      flavorScores?: Record<string, number>;
    },
  ) {
    // 获取当前海报模板
    let template = await this.prisma.posterTemplate.findUnique({ where: { id: 1 } });
    if (!template) {
      // 自动创建默认模板
      template = await this.prisma.posterTemplate.create({
        data: {
          id: 1,
          clubName: 'GOAT CIGAR CLUB',
          tagline: '品味非凡',
        },
      });
    }

    const poster = await this.prisma.poster.create({
      data: {
        userId,
        cigarId: data.cigarId ? BigInt(data.cigarId) : null,
        voiceText: data.voiceText,
        flavorTags: data.flavorTags,
        flavorScores: data.flavorScores ?? {},
        templateSnapshot: JSON.parse(JSON.stringify(template, (_, v) =>
          typeof v === 'bigint' ? v.toString() : v,
        )),
        // posterImageUrl 一期为空，二期接入图片合成服务
      },
    });

    // 无论是否关联雪茄，均写品鉴历史（source: 'poster'）
    await this.prisma.tastingRecord.create({
      data: {
        userId,
        cigarId: data.cigarId ? BigInt(data.cigarId) : null,
        flavorTags: data.flavorTags,
        flavorScores: data.flavorScores ?? {},
        source: 'poster',
      },
    });

    return {
      id: poster.id.toString(),
      status: poster.status,
      createdAt: toBeijing(poster.createdAt),
    };
  }

  /** 获取海报详情 */
  async getPoster(posterId: number) {
    const poster = await this.prisma.poster.findUnique({
      where: { id: BigInt(posterId) },
      include: {
        cigar: { select: { id: true, name: true, brand: true, heroImageUrl: true } },
        user: { select: { nickname: true, avatarUrl: true } },
      },
    });

    if (!poster) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '海报不存在');
    }

    return {
      id: poster.id.toString(),
      userId: poster.userId.toString(),
      nickname: poster.user.nickname,
      avatarUrl: poster.user.avatarUrl,
      cigarId: poster.cigarId?.toString() ?? null,
      cigarName: poster.cigar?.name ?? null,
      cigarBrand: poster.cigar?.brand ?? null,
      heroImageUrl: poster.cigar?.heroImageUrl ?? null,
      voiceText: poster.voiceText,
      flavorTags: poster.flavorTags,
      flavorScores: poster.flavorScores,
      posterImageUrl: poster.posterImageUrl,
      templateSnapshot: poster.templateSnapshot,
      status: poster.status,
      createdAt: toBeijing(poster.createdAt),
    };
  }

  /** 用户端：当前用户海报列表 */
  async listMyPosters(userId: bigint, page: number, pageSize: number) {
    const [list, total] = await Promise.all([
      this.prisma.poster.findMany({
        where: { userId },
        include: {
          cigar: { select: { name: true, brand: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.poster.count({ where: { userId } }),
    ]);

    return {
      list: list.map(p => ({
        id: p.id.toString(),
        cigarName: p.cigar?.name ?? null,
        cigarBrand: p.cigar?.brand ?? null,
        flavorTags: p.flavorTags,
        posterImageUrl: p.posterImageUrl,
        status: p.status,
        createdAt: toBeijing(p.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 管理端：海报列表 */
  async listPosters(page: number, pageSize: number) {
    const [list, total] = await Promise.all([
      this.prisma.poster.findMany({
        include: {
          user: { select: { nickname: true } },
          cigar: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.poster.count(),
    ]);

    return {
      list: list.map(p => ({
        id: p.id.toString(),
        nickname: p.user.nickname,
        cigarName: p.cigar?.name ?? null,
        flavorTags: p.flavorTags,
        posterImageUrl: p.posterImageUrl,
        status: p.status,
        createdAt: toBeijing(p.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 获取海报模板 */
  async getTemplate() {
    let template = await this.prisma.posterTemplate.findUnique({ where: { id: 1 } });
    if (!template) {
      template = await this.prisma.posterTemplate.create({
        data: { id: 1, clubName: 'GOAT CIGAR CLUB', tagline: '品味非凡' },
      });
    }
    return { ...template, id: template.id.toString(), updatedBy: template.updatedBy?.toString() ?? null };
  }

  /** 更新海报模板（单例 upsert） */
  async updateTemplate(data: {
    logoUrl?: string;
    bgColor?: string;
    accentColor?: string;
    fontStyle?: string;
    clubName?: string;
    tagline?: string;
  }, adminId: bigint) {
    const template = await this.prisma.posterTemplate.upsert({
      where: { id: 1 },
      update: { ...data, updatedBy: adminId, updatedAt: new Date() },
      create: {
        id: 1,
        clubName: data.clubName ?? 'GOAT CIGAR CLUB',
        tagline: data.tagline ?? '品味非凡',
        ...data,
        updatedBy: adminId,
      },
    });
    return { ...template, id: template.id.toString(), updatedBy: template.updatedBy?.toString() ?? null };
  }
}
