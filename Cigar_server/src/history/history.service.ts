import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toBeijing } from '../common/utils/time';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取用户品鉴历史 */
  async getHistory(userId: bigint, page: number, pageSize: number) {
    const where = { userId };
    const [list, total] = await Promise.all([
      this.prisma.tastingRecord.findMany({
        where,
        include: {
          cigar: {
            select: { id: true, name: true, brand: true, thumbUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tastingRecord.count({ where }),
    ]);

    return {
      list: list.map(r => ({
        id: r.id.toString(),
        cigarId: r.cigarId?.toString() ?? null,
        cigarName: r.cigar?.name ?? null,
        cigarBrand: r.cigar?.brand ?? null,
        thumbUrl: r.cigar?.thumbUrl ?? null,
        flavorTags: r.flavorTags,
        flavorScores: r.flavorScores,
        source: r.source,
        createdAt: toBeijing(r.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 记录品鉴 */
  async createTasting(
    userId: bigint,
    cigarId: number | null,
    flavorTags: string[],
    flavorScores: Record<string, number> | null,
    source: string,
  ) {
    const record = await this.prisma.tastingRecord.create({
      data: {
        userId,
        cigarId: cigarId ? BigInt(cigarId) : null,
        flavorTags,
        flavorScores: flavorScores ?? {},
        source,
      },
    });

    return {
      id: record.id.toString(),
      createdAt: toBeijing(record.createdAt),
    };
  }
}
