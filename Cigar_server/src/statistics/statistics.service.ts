import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import { Prisma } from '@prisma/client';

// Raw query result types
type DailyRow = { date: string; revenue: bigint; cnt: bigint };
type CategoryRow = {
  category_code: string;
  product_count: bigint;
  sold_qty: bigint;
  revenue: bigint;
};
type TierRow = {
  tier_id: bigint;
  order_count: bigint;
  total_cents: bigint;
};

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

    // Revenue by channel
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

    // ✅ 改为 SQL GROUP BY，不再把记录拉进 JS 内存
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRows = await this.prisma.$queryRaw<DailyRow[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC+8', 'YYYY-MM-DD') AS date,
        SUM(amount_cents)  AS revenue,
        COUNT(*)::bigint   AS cnt
      FROM payment_records
      WHERE status = 'success'
        AND created_at >= ${thirtyDaysAgo}
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC+8', 'YYYY-MM-DD')
      ORDER BY date
    `;

    // Recharge & refund stats
    const [rechargeResult, refundResult] = await Promise.all([
      this.prisma.rechargeOrder.aggregate({
        _sum: { totalCents: true },
        _count: true,
        where: { status: 'success' },
      }),
      this.prisma.refundRecord.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { status: 'success' },
      }),
    ]);

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
      daily: dailyRows.map((r) => ({
        date: r.date,
        revenueCents: r.revenue.toString(),
        revenueYuan: centsToYuan(r.revenue),
        orders: Number(r.cnt),
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
    // ✅ 改为单条 SQL JOIN + GROUP BY，不再全量加载雪茄到内存做 O(n×m) 扫描
    const rows = await this.prisma.$queryRaw<CategoryRow[]>`
      SELECT
        c.category_code,
        COUNT(DISTINCT c.id)::bigint             AS product_count,
        COALESCE(SUM(oi.qty), 0)::bigint         AS sold_qty,
        COALESCE(SUM(oi.actual_amount_cents), 0) AS revenue
      FROM cigars c
      LEFT JOIN order_items oi
        ON oi.product_id = c.id
       AND oi.product_type = 'cigar'
      WHERE c.deleted_at IS NULL
      GROUP BY c.category_code
      ORDER BY revenue DESC
    `;

    return rows.map((r) => ({
      categoryCode: r.category_code,
      productCount: Number(r.product_count),
      soldQty: Number(r.sold_qty),
      revenueCents: r.revenue.toString(),
      revenueYuan: centsToYuan(r.revenue),
    }));
  }

  async getUserStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ✅ 改为 SQL GROUP BY，不再把所有用户记录拉进 JS 内存
    const [dailyRows, rechargeLevelDist, consumeLevelDist, activeUsers, withBalance, totalUsers] =
      await Promise.all([
        this.prisma.$queryRaw<Array<{ date: string; cnt: bigint }>>`
          SELECT
            TO_CHAR(created_at AT TIME ZONE 'UTC+8', 'YYYY-MM-DD') AS date,
            COUNT(*)::bigint AS cnt
          FROM users
          WHERE created_at >= ${thirtyDaysAgo}
          GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC+8', 'YYYY-MM-DD')
          ORDER BY date
        `,
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
        this.prisma.order.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.memberProfile.count({ where: { balanceCents: { gt: 0 } } }),
        this.prisma.user.count(),
      ]);

    // 补全缺失日期（SQL 只返回有数据的天）
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of dailyRows) {
      dailyMap.set(r.date, Number(r.cnt));
    }

    return {
      totalUsers,
      activeUsersLast30Days: activeUsers.length,
      withBalance,
      dailyNewUsers: Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      levelDistribution: {
        recharge: rechargeLevelDist.map((r) => ({ level: r.rechargeLevel, count: r._count })),
        consumption: consumeLevelDist.map((r) => ({ level: r.consumptionLevel, count: r._count })),
      },
    };
  }

  async getStoredValueStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [rechargeTotal, rechargeMonth, consumeTotal, consumeMonth, balanceResult, tiers, tierRows] =
      await Promise.all([
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
        this.prisma.memberProfile.aggregate({ _sum: { balanceCents: true } }),
        this.prisma.rechargeTier.findMany({
          select: { id: true, amountCents: true, displayName: true },
          orderBy: { amountCents: 'asc' },
        }),
        // ✅ 一条 SQL GROUP BY 替换 N 条 aggregate
        this.prisma.$queryRaw<TierRow[]>`
          SELECT
            tier_id,
            COUNT(*)::bigint      AS order_count,
            SUM(total_cents)      AS total_cents
          FROM recharge_orders
          WHERE status = 'success' AND tier_id IS NOT NULL
          GROUP BY tier_id
        `,
      ]);

    const tierUsageMap = new Map(tierRows.map((r) => [r.tier_id.toString(), r]));

    const tierUsage = tiers.map((tier) => {
      const row = tierUsageMap.get(tier.id.toString());
      return {
        tierId: tier.id.toString(),
        displayName: tier.displayName ?? `${Number(tier.amountCents) / 100}元`,
        amountCents: tier.amountCents.toString(),
        amountYuan: centsToYuan(tier.amountCents),
        orderCount: row ? Number(row.order_count) : 0,
        totalCents: row ? row.total_cents.toString() : '0',
        totalYuan: centsToYuan(row?.total_cents ?? 0n),
      };
    });

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
