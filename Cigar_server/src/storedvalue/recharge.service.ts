import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { WechatPayService, WechatCallbackResult } from './wechat-pay.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import { paginate } from '../common/dto/pagination.dto';
import { generateRechargeNo } from '../common/utils/id-generator';
import { Prisma } from '@prisma/client';

@Injectable()
export class RechargeService {
  private readonly logger = new Logger(RechargeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly wechatPay: WechatPayService,
  ) {}

  /** 创建充值订单 + 微信支付下单 */
  async createRecharge(userId: bigint, tierId: bigint, openid: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const cached = await this.redis.get(`idem:recharge:${userId}:${idempotencyKey}`);
      if (cached) {
        const { rechargeNo } = JSON.parse(cached);
        const existing = await this.prisma.rechargeOrder.findUnique({ where: { rechargeNo } });
        if (existing) {
          return {
            idempotent: true,
            rechargeNo: existing.rechargeNo,
            prepayId: await this.redis.get(`prepay:${existing.rechargeNo}`) ?? null,
          };
        }
      }
    }

    const tier = await this.prisma.rechargeTier.findUnique({ where: { id: tierId } });
    if (!tier || !tier.enabled) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '充值档位不存在或已下架');
    }

    // 获取用户信息
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(ErrorCode.NOT_LOGIN, '用户不存在');

    const rechargeNo = generateRechargeNo();
    const totalCents = tier.amountCents + tier.bonusCents;
    const expireAt = new Date(Date.now() + 30 * 60 * 1000);

    // 微信支付下单（使用开发环境的 openid 或真实 openid）
    const payParams = await this.wechatPay.createJsapiOrder({
      outTradeNo: rechargeNo,
      amountCents: Number(tier.amountCents),
      description: `充值 ${centsToYuan(tier.amountCents)} 元`,
      openid: openid || user.openid,
    });

    // 缓存 prepay_id（24h）
    if (payParams.prepayId) {
      await this.redis.set(`prepay:${rechargeNo}`, payParams.prepayId, 86400);
    }

    await this.prisma.rechargeOrder.create({
      data: {
        rechargeNo,
        userId,
        tierId,
        amountCents: tier.amountCents,
        bonusCents: tier.bonusCents,
        totalCents,
        status: 'pending',
        channel: 'wechat',
        expireAt,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    if (idempotencyKey) {
      await this.redis.set(
        `idem:recharge:${userId}:${idempotencyKey}`,
        JSON.stringify({ rechargeNo }),
        600,
      );
    }

    return {
      idempotent: false,
      rechargeNo,
      totalCents: totalCents.toString(),
      totalYuan: centsToYuan(totalCents),
      payParams,
      expireAt: toBeijing(expireAt),
    };
  }

  /** 处理微信支付成功回调（事务内完成：入账 + 积分 + 等级升级） */
  async handlePaymentSuccess(result: WechatCallbackResult) {
    const { outTradeNo, transactionId, amountTotal } = result;

    return this.prisma.$transaction(async (tx) => {
      // 1. 锁充值订单行
      const order = await tx.rechargeOrder.findUnique({ where: { rechargeNo: outTradeNo } });
      if (!order) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '充值订单不存在');
      }

      // 2. 幂等命中：已成功则直接返回
      if (order.status === 'success') {
        const profile = await tx.memberProfile.findUnique({ where: { userId: order.userId } });
        return {
          idempotent: true,
          rechargeNo: outTradeNo,
          balanceAfterCents: profile?.balanceCents.toString() ?? '0',
          balanceAfterYuan: centsToYuan(profile?.balanceCents ?? 0n),
        };
      }

      if (order.status !== 'pending') {
        this.logger.warn(`充值订单 ${outTradeNo} 状态异常: ${order.status}`);
        return { idempotent: false, skipped: true, reason: 'order status not pending' };
      }

      // 3. 校验金额
      if (Number(order.amountCents) !== amountTotal) {
        this.logger.error(`充值金额不匹配: order=${order.amountCents} vs callback=${amountTotal}`);
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '充值金额不匹配');
      }

      // 4. 更新会员资产（余额 + 积分 + 累计充值）
      const totalCents = Number(order.totalCents);
      const profile = await tx.memberProfile.findUnique({ where: { userId: order.userId } });
      if (!profile) throw new BusinessException(ErrorCode.VALIDATION_FAILED, '会员信息不存在');

      const newBalance = profile.balanceCents + BigInt(totalCents);
      const newRechargePoints = profile.rechargePoints + BigInt(totalCents) / 100n; // 1 元 = 1 积分

      await tx.memberProfile.update({
        where: { userId: order.userId },
        data: {
          balanceCents: newBalance,
          rechargePoints: newRechargePoints,
          totalRechargeCents: profile.totalRechargeCents + BigInt(totalCents),
          version: profile.version + 1,
        },
      });

      // 5. 写余额流水
      await tx.balanceTransaction.create({
        data: {
          userId: order.userId,
          type: 'recharge',
          direction: 1,
          amountCents: BigInt(totalCents),
          balanceAfterCents: newBalance,
          relatedType: 'recharge_order',
          relatedId: order.id,
          relatedNo: outTradeNo,
          description: `充值 ${centsToYuan(totalCents)} 元`,
        },
      });

      // 6. 写积分流水
      await tx.pointTransaction.create({
        data: {
          userId: order.userId,
          levelType: 'recharge',
          type: 'recharge_earn',
          direction: 1,
          points: BigInt(totalCents) / 100n,
          pointsAfter: newRechargePoints,
          relatedType: 'recharge_order',
          relatedId: order.id,
          relatedNo: outTradeNo,
          description: `充值获得积分`,
        },
      });

      // 7. 计算并更新充值等级
      const levelConfigs = await tx.levelConfig.findMany({
        where: { levelType: 'recharge' },
        orderBy: { level: 'desc' },
      });

      let newLevel = 1;
      for (const lc of levelConfigs) {
        const minPoints = Number(lc.minPoints);
        const maxPoints = lc.maxPoints !== null ? Number(lc.maxPoints) : null;
        const points = Number(newRechargePoints);
        if (points >= minPoints && (maxPoints === null || points <= maxPoints)) {
          newLevel = lc.level;
          break;
        }
      }

      if (newLevel !== profile.rechargeLevel) {
        await tx.memberProfile.update({
          where: { userId: order.userId },
          data: { rechargeLevel: newLevel },
        });
        await tx.levelChangeLog.create({
          data: {
            userId: order.userId,
            levelType: 'recharge',
            levelBefore: profile.rechargeLevel,
            levelAfter: newLevel,
            triggerType: 'recharge_upgrade',
            relatedNo: outTradeNo,
            remark: `充值升级: ${centsToYuan(totalCents)} 元`,
          },
        });
      }

      // 8. 更新充值订单状态
      await tx.rechargeOrder.update({
        where: { rechargeNo: outTradeNo },
        data: {
          status: 'success',
          channelTradeNo: transactionId,
          paidAt: new Date(),
        },
      });

      return {
        idempotent: false,
        rechargeNo: outTradeNo,
        balanceAfterCents: newBalance.toString(),
        balanceAfterYuan: centsToYuan(newBalance),
        levelUpgraded: newLevel !== profile.rechargeLevel,
        newLevel: newLevel !== profile.rechargeLevel ? newLevel : undefined,
      };
    });
  }

  /** 查询充值订单列表（管理端） */
  async findRechargeOrders(query: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 20, status } = query;
    const where: Prisma.RechargeOrderWhereInput = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.rechargeOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tier: true, user: { select: { id: true, nickname: true, phoneMask: true } } },
      }),
      this.prisma.rechargeOrder.count({ where }),
    ]);

    return paginate(
      list.map((ro) => ({
        id: ro.id.toString(),
        rechargeNo: ro.rechargeNo,
        userId: ro.userId.toString(),
        userName: ro.user.nickname,
        userPhone: ro.user.phoneMask,
        tierName: ro.tier?.displayName ?? null,
        amountCents: ro.amountCents.toString(),
        amountYuan: centsToYuan(ro.amountCents),
        bonusCents: ro.bonusCents.toString(),
        bonusYuan: centsToYuan(ro.bonusCents),
        totalCents: ro.totalCents.toString(),
        totalYuan: centsToYuan(ro.totalCents),
        status: ro.status,
        channelTradeNo: ro.channelTradeNo,
        paidAt: ro.paidAt ? toBeijing(ro.paidAt) : null,
        createdAt: toBeijing(ro.createdAt),
      })),
      total,
      page,
      pageSize,
    );
  }
}
