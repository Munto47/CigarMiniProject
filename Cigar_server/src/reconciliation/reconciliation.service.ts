import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runDailyReconciliation(date?: string, adminId?: bigint) {
    const targetDate = date ? new Date(date) : this.getYesterday();
    const dateStr = targetDate.toISOString().slice(0, 10);

    this.logger.log(`Starting daily reconciliation for ${dateStr}`);

    const result = await this.processChannel('balance', targetDate);
    const report = await this.prisma.reconciliationReport.upsert({
      where: { channel_date: { channel: 'balance', date: targetDate } },
      create: {
        channel: 'balance',
        date: targetDate,
        ...result,
        status: result.diffCount === 0 && result.diffAmountCents === 0n ? 'balanced' : 'diff_found',
      },
      update: {
        ...result,
        status: result.diffCount === 0 && result.diffAmountCents === 0n ? 'balanced' : 'diff_found',
      },
    });

    this.logger.log(
      `Reconciliation for ${dateStr}: ${result.diffCount} diffs, ${result.diffAmountCents} cents diff`,
    );

    return {
      reportId: report.id.toString(),
      channel: report.channel,
      date: dateStr,
      ourCount: report.ourCount,
      ourAmountCents: report.ourAmountCents.toString(),
      ourAmountYuan: centsToYuan(report.ourAmountCents),
      platformCount: report.platformCount,
      platformAmountCents: report.platformAmountCents.toString(),
      platformAmountYuan: centsToYuan(report.platformAmountCents),
      diffCount: report.diffCount,
      diffAmountCents: report.diffAmountCents.toString(),
      diffAmountYuan: centsToYuan(report.diffAmountCents),
      status: report.status,
    };
  }

  private async processChannel(channel: string, date: Date) {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    // Our side: count successful payments
    const ourPayments = await this.prisma.paymentRecord.aggregate({
      _count: true,
      _sum: { amountCents: true },
      where: {
        status: 'success',
        channel,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Our side: also count successful recharge orders
    const ourRecharges = channel === 'wechat'
      ? await this.prisma.rechargeOrder.aggregate({
          _count: true,
          _sum: { totalCents: true },
          where: {
            status: 'success',
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        })
      : { _count: 0, _sum: { totalCents: 0n } };

    const ourCount = ourPayments._count + ourRecharges._count;
    const ourAmount = (ourPayments._sum.amountCents ?? 0n) + (ourRecharges._sum.totalCents ?? 0n);

    // Platform side: stub (actual implementation would call WeChat/Meituan API)
    // For now, use our own data as platform reference
    const platformCount = ourCount;
    const platformAmount = ourAmount;

    const diffCount = ourCount - platformCount;
    const diffAmount = ourAmount - platformAmount;

    return {
      ourCount,
      ourAmountCents: ourAmount,
      platformCount,
      platformAmountCents: platformAmount,
      diffCount,
      diffAmountCents: diffAmount,
      diffDetail: diffCount !== 0 || diffAmount !== 0n
        ? { ourCount, ourAmount: ourAmount.toString(), platformCount, platformAmount: platformAmount.toString() }
        : undefined,
    };
  }

  async getReports(
    page: number = 1,
    pageSize: number = 20,
    channel?: string,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (channel) {
      where.channel = channel;
    }

    const [reports, total] = await Promise.all([
      this.prisma.reconciliationReport.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.reconciliationReport.count({ where }),
    ]);

    return paginate(
      reports.map((r) => ({
        id: r.id.toString(),
        channel: r.channel,
        date: r.date.toISOString().slice(0, 10),
        ourCount: r.ourCount,
        ourAmountCents: r.ourAmountCents.toString(),
        ourAmountYuan: centsToYuan(r.ourAmountCents),
        platformCount: r.platformCount,
        platformAmountCents: r.platformAmountCents.toString(),
        platformAmountYuan: centsToYuan(r.platformAmountCents),
        diffCount: r.diffCount,
        diffAmountCents: r.diffAmountCents.toString(),
        diffAmountYuan: centsToYuan(r.diffAmountCents),
        status: r.status,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async resolveReport(reportId: string, adminId: bigint) {
    try {
      await this.prisma.reconciliationReport.update({
        where: { id: BigInt(reportId) },
        data: {
          status: 'resolved',
          resolvedByAdminId: adminId,
          resolvedAt: new Date(),
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '对账报告不存在');
      }
      throw e;
    }
    return { reportId, status: 'resolved' };
  }

  private getYesterday(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
