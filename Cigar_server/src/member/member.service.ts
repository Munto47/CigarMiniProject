import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: bigint) {
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, avatarUrl: true, phoneMask: true },
      }),
      this.prisma.memberProfile.findUnique({ where: { userId } }),
    ]);

    if (!profile) return null;

    const rechargeLevel = await this.prisma.levelConfig.findUnique({
      where: { levelType_level: { levelType: 'recharge', level: profile.rechargeLevel } },
    });
    const consumeLevel = await this.prisma.levelConfig.findUnique({
      where: { levelType_level: { levelType: 'consumption', level: profile.consumptionLevel } },
    });

    return {
      userId: user?.id.toString(),
      nickname: user?.nickname,
      avatarUrl: user?.avatarUrl,
      phoneMask: user?.phoneMask,
      balanceCents: profile.balanceCents.toString(),
      balanceYuan: centsToYuan(profile.balanceCents),
      rechargeLevel: profile.rechargeLevel,
      rechargeLevelName: rechargeLevel?.name ?? 'V1',
      rechargeLevelIcon: rechargeLevel?.icon ?? 'v1',
      rechargePoints: profile.rechargePoints.toString(),
      consumptionLevel: profile.consumptionLevel,
      consumptionLevelName: consumeLevel?.name ?? 'V1',
      consumptionLevelIcon: consumeLevel?.icon ?? 'v1',
      consumptionPoints: profile.consumptionPoints.toString(),
      totalRechargeCents: profile.totalRechargeCents.toString(),
      totalRechargeYuan: centsToYuan(profile.totalRechargeCents),
      totalSpendCents: profile.totalSpendCents.toString(),
      totalSpendYuan: centsToYuan(profile.totalSpendCents),
      orderCount: profile.orderCount,
      levelUpHint: null, // 一期前端可选择性展示
    };
  }

  async getTransactions(userId: bigint, query: QueryTransactionsDto) {
    const { page = 1, pageSize = 20, type } = query;
    const where: Prisma.BalanceTransactionWhereInput = { userId };

    if (type && type !== 'all') {
      where.type = type;
    }

    const orderBy: Prisma.BalanceTransactionOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    const [list, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.balanceTransaction.count({ where }),
    ]);

    return paginate(
      list.map((tx) => ({
        id: tx.id.toString(),
        type: tx.type,
        direction: tx.direction,
        amountCents: tx.amountCents.toString(),
        amountYuan: centsToYuan(tx.amountCents),
        balanceAfterCents: tx.balanceAfterCents.toString(),
        balanceAfterYuan: centsToYuan(tx.balanceAfterCents),
        relatedType: tx.relatedType,
        relatedNo: tx.relatedNo,
        description: tx.description,
        createdAt: toBeijing(tx.createdAt),
      })),
      total,
      page,
      pageSize,
    );
  }
}
