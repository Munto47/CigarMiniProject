import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { generateRefundNo } from '../common/utils/id-generator';

@Injectable()
export class AdjustService {
  private readonly logger = new Logger(AdjustService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly opLogService: OperationLogService,
  ) {}

  /** 管理员手动调整余额（幂等、事务内完成 + 流水） */
  async adjustBalance(
    adminId: bigint,
    adminName: string,
    dto: { userId: number; amountCents: number; reason: string },
    idempotencyKey: string,
    ip?: string,
    userAgent?: string,
  ) {
    // 幂等第一道防线：Redis
    const idemKey = `idem:adjust:${adminId}:${idempotencyKey}`;
    const cached = await this.redis.get(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      return { idempotent: true, ...data };
    }

    const userId = BigInt(dto.userId);
    const isCredit = dto.amountCents > 0;
    const amountCents = BigInt(Math.abs(dto.amountCents));

    const result = await this.prisma.$transaction(async (tx) => {
      // 锁会员行
      const profile = await tx.memberProfile.findUnique({ where: { userId } });
      if (!profile) throw new BusinessException(ErrorCode.VALIDATION_FAILED, '会员信息不存在');

      const balanceBefore = profile.balanceCents;

      if (!isCredit && balanceBefore < amountCents) {
        throw new BusinessException(ErrorCode.BALANCE_INSUFFICIENT, '余额不足以扣除');
      }

      const balanceAfter = isCredit
        ? balanceBefore + amountCents
        : balanceBefore - amountCents;

      const direction = isCredit ? 1 : -1;
      const type = isCredit ? 'manual_credit' : 'manual_debit';
      const description = isCredit
        ? `管理员手动增加余额 ${centsToYuan(amountCents)} 元：${dto.reason}`
        : `管理员手动扣减余额 ${centsToYuan(amountCents)} 元：${dto.reason}`;

      // 更新余额
      await tx.memberProfile.update({
        where: { userId },
        data: {
          balanceCents: balanceAfter,
          version: profile.version + 1,
        },
      });

      // 写余额流水（唯一约束兜底幂等第二道防线）
      const relatedNo = `ADJ${Date.now()}_${idempotencyKey.slice(0, 8)}`;
      await tx.balanceTransaction.create({
        data: {
          userId,
          type,
          direction,
          amountCents,
          balanceAfterCents: balanceAfter,
          relatedType: 'manual',
          relatedId: null,
          relatedNo,
          description,
          operatorAdminId: adminId,
        },
      });

      return {
        userId: dto.userId.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceBeforeYuan: centsToYuan(balanceBefore),
        amountCents: amountCents.toString(),
        amountYuan: centsToYuan(amountCents),
        balanceAfter: balanceAfter.toString(),
        balanceAfterYuan: centsToYuan(balanceAfter),
        direction,
        relatedNo,
      };
    });

    // 缓存幂等结果
    await this.redis.set(idemKey, JSON.stringify(result), 600);

    // 写操作日志
    await this.opLogService.log({
      adminId,
      adminName,
      module: 'storedvalue',
      action: isCredit ? 'adjust_add' : 'adjust_deduct',
      targetType: 'user',
      targetId: dto.userId.toString(),
      description: `${isCredit ? '增加' : '扣减'}余额 ${centsToYuan(BigInt(Math.abs(dto.amountCents)))} 元：${dto.reason}`,
      level: 'warning',
      beforeData: { balanceCents: result.balanceBefore },
      afterData: { balanceCents: result.balanceAfter },
      ip,
      userAgent,
    });

    return { idempotent: false, ...result };
  }
}
