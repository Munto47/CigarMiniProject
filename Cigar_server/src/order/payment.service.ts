import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { generatePaymentNo } from '../common/utils/id-generator';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  /** 余额支付（同步事务 + 行级锁 + 幂等命中分支） */
  async payByBalance(userId: bigint, orderId: number) {
    const paymentNo = generatePaymentNo();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 锁订单 NOWAIT
      const rows = await tx.$queryRawUnsafe<Array<{
        id: bigint; order_no: string; status: string;
        actual_pay_cents: bigint; user_id: bigint; pay_method: string | null;
        refunded_amount_cents: bigint;
      }>>(
        `SELECT id, order_no, status, actual_pay_cents, user_id, pay_method, refunded_amount_cents
         FROM orders WHERE id = $1 FOR UPDATE NOWAIT`,
        orderId,
      );
      if (!rows || rows.length === 0) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
      }
      const order = rows[0];

      // 幂等命中分支：已支付
      if (order.status === 'paid' || order.status === 'completed') {
        const lastPayment = await tx.paymentRecord.findFirst({
          where: { orderId: BigInt(orderId), status: 'success' },
          orderBy: { paidAt: 'desc' },
        });
        if (lastPayment) {
          const profile = await tx.memberProfile.findUnique({
            where: { userId },
            select: { balanceCents: true },
          });
          return {
            paid: true,
            idempotent: true,
            paymentNo: lastPayment.paymentNo,
            amountCents: lastPayment.amountCents.toString(),
            amountYuan: centsToYuan(lastPayment.amountCents),
            balanceAfterCents: profile?.balanceCents.toString() ?? '0',
            balanceAfterYuan: profile?.balanceCents ? centsToYuan(profile.balanceCents) : '0.00',
          };
        }
      }

      // 状态不允许支付
      if (order.status !== 'pending') {
        throw new BusinessException(ErrorCode.ORDER_STATUS_FORBIDDEN, `订单状态 ${order.status} 不允许支付`);
      }
      if (order.user_id !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, '无权操作此订单');
      }

      const actualPay = order.actual_pay_cents;

      // 2. 查会员余额
      const mpRows = await tx.$queryRawUnsafe<Array<{
        user_id: bigint; balance_cents: bigint; consumption_points: bigint;
        total_spend_cents: bigint; order_count: number; version: number;
      }>>(
        `SELECT user_id, balance_cents, consumption_points, total_spend_cents, order_count, version FROM member_profiles WHERE user_id = $1 FOR UPDATE`,
        userId,
      );
      if (!mpRows || mpRows.length === 0) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '会员信息不存在');
      }
      const mp = mpRows[0];

      if (mp.balance_cents < actualPay) {
        throw new BusinessException(ErrorCode.BALANCE_INSUFFICIENT, '余额不足');
      }

      const balanceBefore = mp.balance_cents;
      const balanceAfter = balanceBefore - actualPay;
      const pointsDelta = actualPay / 100n; // 1 元 = 1 积分（actualPay 单位为分）
      const pointsBefore = mp.consumption_points;
      const pointsAfter = pointsBefore + pointsDelta;

      // 3. 扣减余额
      const updateResult = await tx.$executeRawUnsafe(
        `UPDATE member_profiles
            SET balance_cents = balance_cents - $1,
                total_spend_cents = total_spend_cents + $1,
                consumption_points = consumption_points + $2,
                order_count = order_count + 1,
                version = version + 1,
                updated_at = now()
          WHERE user_id = $3 AND balance_cents >= $1`,
        actualPay, pointsDelta, userId,
      );
      if (updateResult === 0) {
        throw new BusinessException(ErrorCode.BALANCE_INSUFFICIENT, '余额不足');
      }

      // 4. 写 balance_transactions
      await tx.$executeRawUnsafe(
        `INSERT INTO balance_transactions (user_id, type, direction, amount_cents, balance_after_cents, related_type, related_id, related_no, description, created_at)
         VALUES ($1, 'consume', -1, $2, $3, 'order', $4, $5, $6, now())`,
        userId, actualPay, balanceAfter, orderId, order.order_no,
        `订单消费 ${centsToYuan(actualPay)} 元`,
      );

      // 5. 写 point_transactions
      await tx.$executeRawUnsafe(
        `INSERT INTO point_transactions (user_id, level_type, type, direction, points, points_after, related_type, related_id, related_no, description, created_at)
         VALUES ($1, 'consumption', 'consume_earn', 1, $2, $3, 'order', $4, $5, $6, now())`,
        userId, pointsDelta, pointsAfter, orderId, order.order_no,
        `消费获得积分 ${pointsDelta}`,
      );

      // 6. 写 payment_records
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_records (payment_no, order_id, user_id, amount_cents, channel, status, paid_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'balance', 'success', now(), now(), now())`,
        paymentNo, orderId, userId, actualPay,
      );

      // 7. 计算等级（简单规则：比较积分区间）
      const newLevel = await this._calculateLevel(tx, userId, 'consumption', pointsAfter.toString());

      // 8. 实扣库存：stock -= qty, stock_locked -= qty
      const items = await tx.orderItem.findMany({ where: { orderId: BigInt(orderId) } });
      for (const item of items) {
        if (item.productType === 'cigar') {
          await tx.$executeRawUnsafe(
            `UPDATE cigars SET stock = stock - $1, stock_locked = stock_locked - $1, updated_at = now() WHERE id = $2`,
            item.qty, item.productId,
          );
        } else {
          await tx.$executeRawUnsafe(
            `UPDATE drinks SET stock = stock - $1, stock_locked = stock_locked - $1, updated_at = now() WHERE id = $2`,
            item.qty, item.productId,
          );
        }
      }

      // 9. 购买的雪茄写入品鉴历史（每个 cigar 商品一条记录）
      for (const item of items) {
        if (item.productType === 'cigar') {
          await tx.tastingRecord.create({
            data: {
              userId,
              cigarId: item.productId,
              flavorTags: [],
              flavorScores: {},
              source: 'purchased',
            },
          });
        }
      }

      // 10. 更新订单状态
      await tx.order.update({
        where: { id: BigInt(orderId) },
        data: {
          status: 'paid',
          payMethod: 'balance',
          paidAt: new Date(),
          version: { increment: 1 },
        },
      });

      return {
        paid: true,
        idempotent: false,
        paymentNo,
        amountCents: actualPay.toString(),
        amountYuan: centsToYuan(actualPay),
        balanceBeforeCents: balanceBefore.toString(),
        balanceBeforeYuan: centsToYuan(balanceBefore),
        balanceAfterCents: balanceAfter.toString(),
        balanceAfterYuan: centsToYuan(balanceAfter),
        pointsEarned: pointsDelta.toString(),
        levelChanged: newLevel ? true : false,
        newLevel,
      };
    });

    if (!result.idempotent) {
      this.metrics.ordersPaidTotal.inc({ channel: 'balance' });
    }
    return result;
  }

  /** 简单等级计算 */
  private async _calculateLevel(
    tx: any,
    userId: bigint,
    levelType: string,
    pointsStr: string,
  ): Promise<number | null> {
    const points = BigInt(pointsStr);
    const config = await tx.$queryRawUnsafe(
      `SELECT level FROM level_configs
        WHERE level_type = $1 AND enabled = true
          AND min_points <= $2
          AND (max_points IS NULL OR max_points >= $2)
        LIMIT 1`,
      levelType, points,
    ) as Array<{ level: number }>;
    if (!config || config.length === 0) return null;

    const newLevel = config[0].level;
    const existing = await tx.memberProfile.findUnique({
      where: { userId },
      select: { consumptionLevel: true },
    });

    if (existing && existing.consumptionLevel !== newLevel) {
      // 记录等级变更
      const oldLvl = existing.consumptionLevel;
      await tx.$executeRawUnsafe(
        `UPDATE member_profiles SET consumption_level = $1, updated_at = now() WHERE user_id = $2`,
        newLevel, userId,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO level_change_logs (user_id, level_type, level_before, level_after, trigger_type, related_no, created_at)
         VALUES ($1, $2, $3, $4, 'consume_upgrade', $5, now())`,
        userId, levelType, oldLvl, newLevel, `payment_${Date.now()}`,
      );
      return newLevel;
    }
    return null;
  }
}
