import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      todayNewUsers,
      monthNewUsers,
      totalOrders,
      todayOrders,
      monthOrders,
      pendingOrders,
      totalRevenueResult,
      todayRevenueResult,
      monthRevenueResult,
      totalProducts,
      activeProducts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        where: { status: 'success' },
      }),
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        where: { status: 'success', createdAt: { gte: todayStart } },
      }),
      this.prisma.paymentRecord.aggregate({
        _sum: { amountCents: true },
        where: { status: 'success', createdAt: { gte: monthStart } },
      }),
      this.prisma.cigar.count(),
      this.prisma.cigar.count({ where: { status: 'active' } }),
    ]);

    const totalRevenue = totalRevenueResult._sum.amountCents ?? 0n;
    const todayRevenue = todayRevenueResult._sum.amountCents ?? 0n;
    const monthRevenue = monthRevenueResult._sum.amountCents ?? 0n;

    // Completed/cancelled/refunded order stats
    const [completedOrders, cancelledOrders, refundedOrders] = await Promise.all([
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.order.count({ where: { status: 'cancelled' } }),
      this.prisma.order.count({ where: { status: 'refunded' } }),
    ]);

    // Total balance across all users
    const balanceResult = await this.prisma.memberProfile.aggregate({
      _sum: { balanceCents: true },
    });
    const totalBalance = balanceResult._sum.balanceCents ?? 0n;

    return {
      users: {
        total: totalUsers,
        todayNew: todayNewUsers,
        monthNew: monthNewUsers,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        month: monthOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        refunded: refundedOrders,
      },
      revenue: {
        totalCents: totalRevenue.toString(),
        totalYuan: centsToYuan(totalRevenue),
        todayCents: todayRevenue.toString(),
        todayYuan: centsToYuan(todayRevenue),
        monthCents: monthRevenue.toString(),
        monthYuan: centsToYuan(monthRevenue),
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      balance: {
        totalCents: totalBalance.toString(),
        totalYuan: centsToYuan(totalBalance),
      },
    };
  }

  async getSalesTrend(days: number = 7) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    const payments = await this.prisma.paymentRecord.findMany({
      where: {
        status: 'success',
        createdAt: { gte: startDate },
      },
      select: { amountCents: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build trend map using local date strings
    const trendMap = new Map<string, { revenue: bigint; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      trendMap.set(key, { revenue: 0n, orders: 0 });
    }

    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}-${String(p.createdAt.getDate()).padStart(2, '0')}`;
      const entry = trendMap.get(key);
      if (entry) {
        entry.revenue += p.amountCents;
        entry.orders += 1;
      }
    }

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenueCents: data.revenue.toString(),
      revenueYuan: centsToYuan(data.revenue),
      orders: data.orders,
    }));
  }

  async getRecentOrders(limit: number = 10) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNo: true,
        userNameSnapshot: true,
        status: true,
        actualPayCents: true,
        payMethod: true,
        createdAt: true,
      },
    });

    return orders.map((o) => ({
      orderId: o.id.toString(),
      orderNo: o.orderNo,
      userName: o.userNameSnapshot,
      status: o.status,
      actualPayCents: o.actualPayCents.toString(),
      actualPayYuan: centsToYuan(o.actualPayCents),
      payMethod: o.payMethod,
      createdAt: toBeijing(o.createdAt),
    }));
  }

  async getTopProducts(limit: number = 10) {
    // Aggregate order_items to find top-selling products
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId', 'nameSnapshot', 'productType'],
      _sum: { qty: true, actualAmountCents: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: limit,
    });

    return items.map((i) => ({
      productId: i.productId.toString(),
      productType: i.productType,
      name: i.nameSnapshot,
      soldQty: i._sum.qty ?? 0,
      revenueCents: (i._sum.actualAmountCents ?? 0n).toString(),
      revenueYuan: centsToYuan(i._sum.actualAmountCents ?? 0n),
    }));
  }
}
