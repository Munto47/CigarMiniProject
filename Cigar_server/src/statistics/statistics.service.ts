import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesStats(startDate?: string, endDate?: string) {
    const where: Prisma.PaymentRecordWhereInput = { status: 'success' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Revenue by payment channel
    const [balancePayments, wechatPayments, meituanPayments] = await Promise.all([
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { ...where, channel: 'balance' },
      }),
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { ...where, channel: 'wechat' },
      }),
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { ...where, channel: 'meituan' },
      }),
    ]);

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyPayments = await this.prisma.paymentRecord.findMany({
      where: { status: 'success', createdAt: { gte: thirtyDaysAgo } },
      select: { amountCents: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { revenue: bigint; count: number }>();
    for (const p of dailyPayments) {
      const key = p.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) ?? { revenue: 0n, count: 0 };
      entry.revenue += p.amountCents;
      entry.count += 1;
      dailyMap.set(key, entry);
    }

    // Recharge stats
    const rechargeResult = await this.prisma.rechargeOrder.aggregate({
      _sum: { totalCents: true },
      _count: true,
      where: { status: 'success' },
    });

    // Refund stats
    const refundResult = await this.prisma.refundRecord.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: { status: 'success' },
    });

    return {
      byChannel: {
        balance: {
          count: balancePayments._count,
          amountCents: (balancePayments._sum.amountCents ?? 0n).toString(),
          amountYuan: centsToYuan(balancePayments._sum.amountCents ?? 0n),
        },
        wechat: {
          count: wechatPayments._count,
          amountCents: (wechatPayments._sum.amountCents ?? 0n).toString(),
          amountYuan: centsToYuan(wechatPayments._sum.amountCents ?? 0n),
        },
        meituan: {
          count: meituanPayments._count,
          amountCents: (meituanPayments._sum.amountCents ?? 0n).toString(),
          amountYuan: centsToYuan(meituanPayments._sum.amountCents ?? 0n),
        },
      },
      daily: Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          revenueCents: data.revenue.toString(),
          revenueYuan: centsToYuan(data.revenue),
          orders: data.count,
        })),
      recharge: {
        totalCount: rechargeResult._count,
        totalCents: (rechargeResult._sum.totalCents ?? 0n).toString(),
        totalYuan: centsToYuan(rechargeResult._sum.totalCents ?? 0n),
      },
      refund: {
        totalCount: refundResult._count,
        totalCents: (refundResult._sum.amountCents ?? 0n).toString(),
        totalYuan: centsToYuan(refundResult._sum.amountCents ?? 0n),
      },
    };
  }

  async getCategoryStats() {
    // Get cigars with their categories
    const cigars = await this.prisma.cigar.findMany({
      select: { id: true, name: true, categoryCode: true },
    });

    const cigarIds = cigars.map((c) => c.id);

    // Aggregate order items for these cigars
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { qty: true, actualAmountCents: true },
      where: { productType: 'cigar', productId: { in: cigarIds } },
    });

    // Build category stats
    const catMap = new Map<string, { name: string; qty: number; revenue: bigint; productCount: number }>();
    for (const c of cigars) {
      const entry = catMap.get(c.categoryCode) ?? {
        name: c.categoryCode,
        qty: 0,
        revenue: 0n,
        productCount: 0,
      };
      entry.productCount += 1;
      catMap.set(c.categoryCode, entry);
    }

    for (const item of items) {
      const cigar = cigars.find((c) => c.id === item.productId);
      if (cigar) {
        const entry = catMap.get(cigar.categoryCode);
        if (entry) {
          entry.qty += item._sum.qty ?? 0;
          entry.revenue += item._sum.actualAmountCents ?? 0n;
        }
      }
    }

    return Array.from(catMap.entries())
      .sort(([, a], [, b]) => Number(b.revenue - a.revenue))
      .map(([code, data]) => ({
        categoryCode: code,
        productCount: data.productCount,
        soldQty: data.qty,
        revenueCents: data.revenue.toString(),
        revenueYuan: centsToYuan(data.revenue),
      }));
  }

  async getUserStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily new users for last 30 days
    const newUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const u of newUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }

    // Level distribution
    const [rechargeLevelDist, consumeLevelDist] = await Promise.all([
      this.prisma.memberProfile.groupBy({
        by: ['rechargeLevel'],
        _count: true,
        orderBy: { rechargeLevel: 'asc' },
      }),
      this.prisma.memberProfile.groupBy({
        by: ['consumptionLevel'],
        _count: true,
        orderBy: { consumptionLevel: 'asc' },
      }),
    ]);

    // Active users (placed orders in last 30 days)
    const activeUsers = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Users with balance
    const withBalance = await this.prisma.memberProfile.count({
      where: { balanceCents: { gt: 0 } },
    });

    const totalUsers = await this.prisma.user.count();

    return {
      totalUsers,
      activeUsersLast30Days: activeUsers.length,
      withBalance,
      dailyNewUsers: Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      levelDistribution: {
        recharge: rechargeLevelDist.map((r) => ({
          level: r.rechargeLevel,
          count: r._count,
        })),
        consumption: consumeLevelDist.map((r) => ({
          level: r.consumptionLevel,
          count: r._count,
        })),
      },
    };
  }

  async getStoredValueStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Recharge stats
    const [rechargeTotal, rechargeMonth] = await Promise.all([
      this.prisma.rechargeOrder.aggregate({
        _sum: { totalCents: true, amountCents: true, bonusCents: true },
        _count: true,
        where: { status: 'success' },
      }),
      this.prisma.rechargeOrder.aggregate({
        _sum: { totalCents: true },
        _count: true,
        where: { status: 'success', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Consumption from balance transactions
    const [consumeTotal, consumeMonth] = await Promise.all([
      this.prisma.balanceTransaction.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { type: 'consume' },
      }),
      this.prisma.balanceTransaction.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { type: 'consume', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Total balance in system
    const balanceResult = await this.prisma.memberProfile.aggregate({
      _sum: { balanceCents: true },
    });

    // Tier usage
    const tiers = await this.prisma.rechargeTier.findMany({
      select: { id: true, amountCents: true, displayName: true },
      orderBy: { amountCents: 'asc' },
    });

    const tierUsagePromises = tiers.map(async (tier) => {
      const agg = await this.prisma.rechargeOrder.aggregate({
        _count: true,
        _sum: { totalCents: true },
        where: { status: 'success', tierId: tier.id },
      });
      return {
        tierId: tier.id.toString(),
        displayName: tier.displayName ?? `${Number(tier.amountCents) / 100}元`,
        amountCents: tier.amountCents.toString(),
        amountYuan: centsToYuan(tier.amountCents),
        orderCount: agg._count,
        totalCents: (agg._sum.totalCents ?? 0n).toString(),
        totalYuan: centsToYuan(agg._sum.totalCents ?? 0n),
      };
    });
    const tierUsage = await Promise.all(tierUsagePromises);

    return {
      recharge: {
        totalCount: rechargeTotal._count,
        totalAmountCents: (rechargeTotal._sum.amountCents ?? 0n).toString(),
        totalAmountYuan: centsToYuan(rechargeTotal._sum.amountCents ?? 0n),
        totalBonusCents: (rechargeTotal._sum.bonusCents ?? 0n).toString(),
        totalBonusYuan: centsToYuan(rechargeTotal._sum.bonusCents ?? 0n),
        monthCount: rechargeMonth._count,
        monthCents: (rechargeMonth._sum.totalCents ?? 0n).toString(),
        monthYuan: centsToYuan(rechargeMonth._sum.totalCents ?? 0n),
      },
      consume: {
        totalCount: consumeTotal._count,
        totalAmountCents: (consumeTotal._sum.amountCents ?? 0n).toString(),
        totalAmountYuan: centsToYuan(consumeTotal._sum.amountCents ?? 0n),
        monthCount: consumeMonth._count,
        monthCents: (consumeMonth._sum.amountCents ?? 0n).toString(),
        monthYuan: centsToYuan(consumeMonth._sum.amountCents ?? 0n),
      },
      totalBalanceCents: (balanceResult._sum.balanceCents ?? 0n).toString(),
      totalBalanceYuan: centsToYuan(balanceResult._sum.balanceCents ?? 0n),
      tierUsage,
    };
  }

  async exportSalesData(startDate?: string, endDate?: string) {
    const where: Prisma.OrderWhereInput = {
      status: { in: ['paid', 'completed'] },
    };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      订单编号: o.orderNo,
      用户: o.userNameSnapshot,
      状态: o.status,
      支付方式: o.payMethod ?? '-',
      实付金额: centsToYuan(o.actualPayCents),
      商品明细: o.orderItems.map((i) => `${i.nameSnapshot} x${i.qty}`).join('; '),
      创建时间: o.createdAt.toISOString(),
      支付时间: o.paidAt?.toISOString() ?? '-',
    }));
  }
}
