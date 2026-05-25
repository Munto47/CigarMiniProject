import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 每日凌晨 3:00 自动执行前一日对账 */
  @Cron('0 3 * * *')
  async scheduledReconciliation() {
    const yesterday = this.getYesterday();
    const dateStr = yesterday.toISOString().slice(0, 10);
    this.logger.log(`定时对账任务启动: ${dateStr}`);
    try {
      const result = await this.runDailyReconciliation(dateStr);
      this.logger.log(`定时对账完成: ${dateStr}, 差异数=${result.diffCount}`);
    } catch (err) {
      this.logger.error(`定时对账失败: ${dateStr}`, err);
    }
  }

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

    // 我方数据：成功支付记录 + 充值订单
    const ourPayments = await this.prisma.paymentRecord.aggregate({
      _count: true,
      _sum: { amountCents: true },
      where: {
        status: 'success',
        channel,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

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

    // 平台侧数据：需对接微信支付账单下载 API 获取真实对账单
    // https://pay.weixin.qq.com/doc/v3/merchant/4012464657
    // 当前为占位——未对接外部平台时差异始终为 0
    let platformCount: number;
    let platformAmount: bigint;

    if (channel === 'wechat') {
      // TODO: 调用微信支付账单下载 API，获取当日平台侧交易数据
      // const bill = await this.wechatBillService.downloadBill(date);
      // platformCount = bill.count;
      // platformAmount = bill.amount;
      platformCount = -1; // -1 表示未对接
      platformAmount = -1n;
    } else if (channel === 'balance') {
      // 余额支付无外部平台，自身数据即为平台数据
      platformCount = ourCount;
      platformAmount = ourAmount;
    } else {
      // 美团等渠道：需调用对应平台 API
      platformCount = -1;
      platformAmount = -1n;
    }

    const diffCount = platformCount === -1 ? 0 : ourCount - platformCount;
    const diffAmount = platformAmount === -1n ? 0n : (ourAmount - platformAmount);

    return {
      ourCount,
      ourAmountCents: ourAmount,
      platformCount,
      platformAmountCents: platformAmount,
      diffCount,
      diffAmountCents: diffAmount,
      diffDetail: diffCount !== 0 || diffAmount !== 0n
        ? { ourCount, ourAmount: ourAmount.toString(), platformCount: platformCount.toString(), platformAmount: platformAmount.toString() }
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
