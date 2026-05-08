import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    rechargeLevel?: number;
    consumptionLevel?: number;
  }) {
    const { page, pageSize, keyword, rechargeLevel, consumptionLevel } = params;

    const where: Prisma.UserWhereInput = {};
    if (keyword) {
      where.nickname = { contains: keyword };
    }

    const profileWhere: Prisma.MemberProfileWhereInput = {};
    if (rechargeLevel) profileWhere.rechargeLevel = rechargeLevel;
    if (consumptionLevel) profileWhere.consumptionLevel = consumptionLevel;
    if (Object.keys(profileWhere).length > 0) {
      where.memberProfile = profileWhere;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          phoneMask: true,
          birthday: true,
          lastLoginAt: true,
          createdAt: true,
          memberProfile: {
            select: {
              balanceCents: true,
              rechargeLevel: true,
              consumptionLevel: true,
              rechargePoints: true,
              consumptionPoints: true,
              totalRechargeCents: true,
              totalSpendCents: true,
              orderCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    const list = users.map((u) => ({
      id: u.id.toString(),
      nickname: u.nickname,
      avatarUrl: u.avatarUrl,
      phoneMask: u.phoneMask,
      birthday: u.birthday ? toBeijing(u.birthday).split(' ')[0] : null,
      lastLoginAt: u.lastLoginAt ? toBeijing(u.lastLoginAt) : null,
      joinDate: toBeijing(u.createdAt).split(' ')[0],
      balance: u.memberProfile?.balanceCents
        ? Number(u.memberProfile.balanceCents) / 100
        : 0,
      balanceCents: u.memberProfile?.balanceCents?.toString() ?? '0',
      rechargeLevel: u.memberProfile?.rechargeLevel ?? 1,
      consumptionLevel: u.memberProfile?.consumptionLevel ?? 1,
      rechargePoints: u.memberProfile?.rechargePoints?.toString() ?? '0',
      consumptionPoints: u.memberProfile?.consumptionPoints?.toString() ?? '0',
      totalRecharge: u.memberProfile?.totalRechargeCents
        ? Number(u.memberProfile.totalRechargeCents) / 100
        : 0,
      totalRechargeCents: u.memberProfile?.totalRechargeCents?.toString() ?? '0',
      totalSpend: u.memberProfile?.totalSpendCents
        ? Number(u.memberProfile.totalSpendCents) / 100
        : 0,
      totalSpendCents: u.memberProfile?.totalSpendCents?.toString() ?? '0',
      orderCount: u.memberProfile?.orderCount ?? 0,
    }));

    return paginate(list, total, page, pageSize);
  }

  async getMemberDetail(userId: bigint) {
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          phoneMask: true,
          birthday: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.memberProfile.findUnique({
        where: { userId },
      }),
    ]);

    if (!user) return null;

    const rechargeLevelCfg = profile
      ? await this.prisma.levelConfig.findUnique({
          where: {
            levelType_level: {
              levelType: 'recharge',
              level: profile.rechargeLevel,
            },
          },
        })
      : null;

    const consumptionLevelCfg = profile
      ? await this.prisma.levelConfig.findUnique({
          where: {
            levelType_level: {
              levelType: 'consumption',
              level: profile.consumptionLevel,
            },
          },
        })
      : null;

    const nextRechargeLevel = profile
      ? await this.prisma.levelConfig.findFirst({
          where: {
            levelType: 'recharge',
            minPoints: { gt: profile.rechargePoints },
          },
          orderBy: { minPoints: 'asc' },
        })
      : null;

    const nextConsumptionLevel = profile
      ? await this.prisma.levelConfig.findFirst({
          where: {
            levelType: 'consumption',
            minPoints: { gt: profile.consumptionPoints },
          },
          orderBy: { minPoints: 'asc' },
        })
      : null;

    // Recent recharge orders (top 20)
    const rechargeRecords = userId
      ? await this.prisma.rechargeOrder.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];

    // Recent orders (top 20)
    const recentOrders = userId
      ? await this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];

    // Get order items for recent orders
    const orderIds = recentOrders.map((o) => o.id);
    const orderItemsMap = new Map<string, { nameSnapshot: string | null; qty: number; actualAmountCents: bigint | null }[]>();
    const orderPaymentsMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const [allItems, allPayments] = await Promise.all([
        this.prisma.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            orderId: true,
            nameSnapshot: true,
            qty: true,
            actualAmountCents: true,
          },
        }),
        this.prisma.paymentRecord.findMany({
          where: {
            orderId: { in: orderIds },
            status: 'success',
          },
          select: { orderId: true, channel: true },
          orderBy: { id: 'asc' },
        }),
      ]);
      for (const item of allItems) {
        const key = item.orderId.toString();
        if (!orderItemsMap.has(key)) orderItemsMap.set(key, []);
        orderItemsMap.get(key)!.push(item);
      }
      for (const pay of allPayments) {
        if (!orderPaymentsMap.has(pay.orderId.toString())) {
          orderPaymentsMap.set(pay.orderId.toString(), pay.channel);
        }
      }
    }

    // Balance transactions (top 30)
    const transactions = userId
      ? await this.prisma.balanceTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
      : [];

    // Level change logs (top 20)
    const levelChanges = userId
      ? await this.prisma.levelChangeLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];

    return {
      id: user.id.toString(),
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phoneMask: user.phoneMask,
      phone: user.phoneMask,
      birthday: user.birthday
        ? toBeijing(user.birthday).split(' ')[0]
        : null,
      lastLoginAt: user.lastLoginAt ? toBeijing(user.lastLoginAt) : null,
      joinDate: toBeijing(user.createdAt).split(' ')[0],
      balance: profile
        ? Number(profile.balanceCents) / 100
        : 0,
      balanceCents: profile?.balanceCents?.toString() ?? '0',
      rechargeLevel: profile?.rechargeLevel ?? 1,
      rechargeLevelName: rechargeLevelCfg?.name ?? 'V1',
      rechargePoints: profile?.rechargePoints?.toString() ?? '0',
      consumptionLevel: profile?.consumptionLevel ?? 1,
      consumptionLevelName: consumptionLevelCfg?.name ?? 'V1',
      consumptionPoints: profile?.consumptionPoints?.toString() ?? '0',
      totalRecharge: profile
        ? Number(profile.totalRechargeCents) / 100
        : 0,
      totalRechargeCents: profile?.totalRechargeCents?.toString() ?? '0',
      totalSpend: profile
        ? Number(profile.totalSpendCents) / 100
        : 0,
      totalSpendCents: profile?.totalSpendCents?.toString() ?? '0',
      orderCount: profile?.orderCount ?? 0,
      // Next level info
      nextRechargeGap: nextRechargeLevel
        ? Number(nextRechargeLevel.minPoints - (profile?.rechargePoints ?? 0n))
        : null,
      nextConsumptionGap: nextConsumptionLevel
        ? Number(
            nextConsumptionLevel.minPoints - (profile?.consumptionPoints ?? 0n),
          )
        : null,
      // Tab data
      rechargeRecords: rechargeRecords.map((r) => ({
        id: r.id.toString(),
        orderNo: r.rechargeNo,
        amount: Number(r.amountCents) / 100,
        amountCents: r.amountCents.toString(),
        paymentMethod: r.channel,
        pointsAdded: Number(r.totalCents),
        status: r.status,
        time: r.paidAt ? toBeijing(r.paidAt) : toBeijing(r.createdAt),
      })),
      consumptionRecords: recentOrders.map((o) => {
        const items = orderItemsMap.get(o.id.toString()) ?? [];
        const payChannel = orderPaymentsMap.get(o.id.toString()) ?? 'balance';
        const productNames = items
          .map((i) => i.nameSnapshot ?? '')
          .filter(Boolean)
          .join(', ');
        return {
          id: o.id.toString(),
          orderNo: o.orderNo,
          productInfo: productNames || '商品',
          amount: Number(o.actualPayCents) / 100,
          amountCents: o.actualPayCents.toString(),
          paymentMethod: payChannel,
          pointsAdded: 0,
          levelBefore: 1,
          levelAfter: 1,
          orderStatus: o.status,
          syncStatus: o.meituanSyncStatus === 'not_required' ? 'not_required' : o.meituanSyncStatus,
          time: toBeijing(o.createdAt),
        };
      }),
      levelChangeRecords: levelChanges.map((l) => ({
        id: l.id.toString(),
        levelType: l.levelType,
        levelBefore: l.levelBefore,
        levelAfter: l.levelAfter,
        triggerType: l.triggerType,
        triggerOrderNo: l.relatedNo,
        time: toBeijing(l.createdAt),
      })),
      transactions: transactions.map((tx) => ({
        id: tx.id.toString(),
        type: tx.type,
        direction: tx.direction,
        amountCents: tx.amountCents.toString(),
        amountYuan: centsToYuan(tx.amountCents),
        balanceAfterCents: tx.balanceAfterCents.toString(),
        relatedNo: tx.relatedNo,
        description: tx.description,
        time: toBeijing(tx.createdAt),
      })),
      // Level configs
      rechargeLevelConfigs: [],
      consumptionLevelConfigs: [],
    };
  }

  async getMemberStats() {
    const totalMembers = await this.prisma.memberProfile.count();
    const highLevel = await this.prisma.memberProfile.count({
      where: { rechargeLevel: { gte: 7 } },
    });
    const midLevel = await this.prisma.memberProfile.count({
      where: { rechargeLevel: { gte: 4, lte: 6 } },
    });
    const lowLevel = await this.prisma.memberProfile.count({
      where: { rechargeLevel: { gte: 1, lte: 3 } },
    });

    return {
      totalMembers,
      highLevel,
      midLevel,
      lowLevel,
    };
  }
}
