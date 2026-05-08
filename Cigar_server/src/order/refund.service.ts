import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { MetricsService } from '../metrics/metrics.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { generateRefundNo } from '../common/utils/id-generator';

interface RawOrder {
  id: bigint;
  order_no: string;
  status: string;
  user_id: bigint;
  actual_pay_cents: bigint;
  refunded_amount_cents: bigint;
  pay_method: string | null;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly opLogService: OperationLogService,
    private readonly metrics: MetricsService,
  ) {}

  /** 退款主流程（幂等、进行中保护、渠道决策） */
  async processRefund(
    adminId: bigint,
    adminName: string,
    orderId: number,
    dto: { amountCents: number; reason: string; refundChannel?: string },
    idempotencyKey: string,
    ip?: string,
    userAgent?: string,
  ) {
    const idemKey = `idem:refund:${adminId}:${idempotencyKey}`;
    const cached = await this.redis.get(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      return { idempotent: true, ...data };
    }

    const amountCents = dto.amountCents;
    const refundNo = generateRefundNo();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 锁订单
      const rows = await tx.$queryRawUnsafe(
        `SELECT id, order_no, status, user_id, actual_pay_cents, refunded_amount_cents, pay_method
         FROM orders WHERE id = $1 FOR UPDATE NOWAIT`,
        orderId,
      ) as RawOrder[];
      if (!rows || rows.length === 0) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
      }
      const raw = rows[0];

      // 检查退款状态
      const refundableStatuses = ['paid', 'completed', 'refunding'];
      if (!refundableStatuses.includes(raw.status)) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_FORBIDDEN, `订单状态 ${raw.status} 不允许退款`);
      }

      // 检查可退金额（raw column values are numbers from pg driver for safe bigints）
      const refundable = Number(raw.actual_pay_cents) - Number(raw.refunded_amount_cents);
      if (refundable < amountCents) {
        throw new BusinessException(ErrorCode.REFUND_EXCEED,
          `退款金额超过可退金额（可退 ${centsToYuan(BigInt(refundable))} 元）`);
      }

      // 进行中保护
      const inflight = await tx.refundRecord.findFirst({
        where: { orderId: BigInt(orderId), status: 'pending' },
      });
      if (inflight) {
        throw new BusinessException(ErrorCode.REFUND_IN_FLIGHT, '存在进行中的退款，禁止重复发起');
      }

      const channel = dto.refundChannel ?? 'auto';
      const actualChannel = channel === 'auto'
        ? (raw.pay_method === 'balance' ? 'balance' : 'wechat')
        : channel;

      // 创建退款单
      await tx.$executeRawUnsafe(
        `INSERT INTO refund_records (refund_no, idempotency_key, order_id, user_id, amount_cents, channel, status, reason, operator_admin_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, now(), now())`,
        refundNo, idempotencyKey, orderId, raw.user_id, amountCents, actualChannel, dto.reason, Number(adminId),
      );

      if (actualChannel === 'balance') {
        await this._balanceRefund(tx, {
          userId: raw.user_id,
          orderNo: raw.order_no,
          id: raw.id,
        }, amountCents, refundNo);
      }

      // 更新 refunded_amount_cents
      const newRefunded = Number(raw.refunded_amount_cents) + amountCents;
      const isFullRefund = newRefunded >= Number(raw.actual_pay_cents);
      const newStatus = isFullRefund ? 'refunded' : 'refunding';

      await tx.$executeRawUnsafe(
        `UPDATE orders SET refunded_amount_cents = $1, status = $2, updated_at = now() WHERE id = $3`,
        newRefunded, newStatus, orderId,
      );

      if (actualChannel === 'balance') {
        await tx.$executeRawUnsafe(
          `UPDATE refund_records SET status = 'success', updated_at = now() WHERE refund_no = $1`,
          refundNo,
        );
      }

      return {
        refundNo,
        status: actualChannel === 'balance' ? 'success' : 'pending',
        note: actualChannel === 'balance' ? '已退回余额' : '已发起退款，等待第三方回调',
        amountCents: String(amountCents),
        amountYuan: centsToYuan(BigInt(amountCents)),
        channel: actualChannel,
        fullRefund: isFullRefund,
      };
    });

    await this.redis.set(idemKey, JSON.stringify(result), 600);

    const resultChannel = result.channel;
    if (result.status === 'success') {
      this.metrics.ordersRefundedTotal.inc({ channel: resultChannel });
    }

    await this.opLogService.log({
      adminId,
      adminName,
      module: 'order',
      action: 'refund',
      targetType: 'order',
      targetId: String(orderId),
      description: `退款 ${centsToYuan(BigInt(dto.amountCents))} 元：${dto.reason}`,
      level: 'warning',
      ip,
      userAgent,
    });

    return { idempotent: false, ...result };
  }

  /** 余额退款：事务内回退余额、积分、可能等级 */
  private async _balanceRefund(
    tx: any,
    order: { userId: unknown; orderNo: string; id: unknown },
    amountCents: number,
    refundNo: string,
  ) {
    const userId = order.userId;
    const pointsDelta = amountCents;

    // 回退余额
    await tx.$executeRawUnsafe(
      `UPDATE member_profiles
          SET balance_cents = balance_cents + $1,
              consumption_points = CASE WHEN consumption_points >= $2 THEN consumption_points - $2 ELSE 0 END,
              total_spend_cents = CASE WHEN total_spend_cents >= $1 THEN total_spend_cents - $1 ELSE 0 END,
              version = version + 1,
              updated_at = now()
        WHERE user_id = $3`,
      amountCents, pointsDelta, userId,
    );

    // 余额流水（退款）
    const mp = await tx.$queryRawUnsafe(
      `SELECT balance_cents FROM member_profiles WHERE user_id = $1`, userId,
    ) as Array<{ balance_cents: unknown }>;
    const balanceAfter = Number(mp?.[0]?.balance_cents ?? 0);

    await tx.$executeRawUnsafe(
      `INSERT INTO balance_transactions (user_id, type, direction, amount_cents, balance_after_cents, related_type, related_id, related_no, description, created_at)
       VALUES ($1, 'refund', 1, $2, $3, 'order', $4, $5, $6, now())`,
      userId, amountCents, balanceAfter, order.id, order.orderNo,
      `订单退款 ${centsToYuan(BigInt(amountCents))} 元`,
    );

    // 积分流水（退款扣回）
    const mp2 = await tx.$queryRawUnsafe(
      `SELECT consumption_points FROM member_profiles WHERE user_id = $1`, userId,
    ) as Array<{ consumption_points: unknown }>;
    const pointsAfter = Number(mp2?.[0]?.consumption_points ?? 0);

    await tx.$executeRawUnsafe(
      `INSERT INTO point_transactions (user_id, level_type, type, direction, points, points_after, related_type, related_id, related_no, description, created_at)
       VALUES ($1, 'consumption', 'consume_revoke', -1, $2, $3, 'order', $4, $5, $6, now())`,
      userId, pointsDelta, pointsAfter, order.id, order.orderNo,
      `退款扣回积分 ${pointsDelta}`,
    );

    // 检查等级降级
    const levelConfigs = await tx.$queryRawUnsafe(
      `SELECT level FROM level_configs
        WHERE level_type = 'consumption' AND enabled = true
          AND min_points <= $1
          AND (max_points IS NULL OR max_points >= $1)
        LIMIT 1`,
      pointsAfter,
    ) as Array<{ level: number }>;

    if (levelConfigs && levelConfigs.length > 0) {
      const newLevel = levelConfigs[0].level;
      const oldProfile = await tx.$queryRawUnsafe(
        `SELECT consumption_level FROM member_profiles WHERE user_id = $1`, userId,
      ) as Array<{ consumption_level: number }>;
      if (oldProfile && oldProfile.length > 0 && oldProfile[0].consumption_level !== newLevel) {
        const oldLvl = oldProfile[0].consumption_level;
        await tx.$executeRawUnsafe(
          `UPDATE member_profiles SET consumption_level = $1, updated_at = now() WHERE user_id = $2`,
          newLevel, userId,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO level_change_logs (user_id, level_type, level_before, level_after, trigger_type, related_no, created_at)
           VALUES ($1, 'consumption', $2, $3, 'refund_downgrade', $4, now())`,
          userId, oldLvl, newLevel, `refund_${refundNo}`,
        );
      }
    }
  }
}
