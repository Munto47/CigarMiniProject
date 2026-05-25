import { Controller, Get, Post, Query, Body, Req, Headers, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdjustService } from './adjust.service';
import { RechargeService } from './recharge.service';
import { LevelRecalcService } from './level-recalc.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate } from '../common/dto/pagination.dto';
import { centsToYuan } from '../common/utils/money';
import { toBeijing } from '../common/utils/time';
import { AdjustBalanceDto, QueryBalanceTxDto, QueryRechargeDto } from './dto/recharge.dto';
import type { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('admin/storedvalue')
@ApiBearerAuth()
@Controller('admin/storedvalue')
export class StoredValueAdminController {
  constructor(
    private readonly adjustService: AdjustService,
    private readonly rechargeService: RechargeService,
    private readonly levelRecalcService: LevelRecalcService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('transactions/adjust')
  @RequirePermissions('storedvalue:adjust')
  @ApiOperation({ summary: '手动调整余额（幂等）' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '幂等键' })
  async adjustBalance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdjustBalanceDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Req() req: Request,
  ) {
    if (!idempotencyKey) {
      return { code: 2001, message: '缺少 Idempotency-Key 头' };
    }
    const adminId = BigInt(user.sub);
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { name: true },
    });
    if (!admin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '管理员不存在');
    }
    return this.adjustService.adjustBalance(
      adminId,
      admin.name,
      dto,
      idempotencyKey,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('transactions')
  @RequirePermissions('storedvalue:read')
  @ApiOperation({ summary: '余额流水查询' })
  async getTransactions(@Query() query: QueryBalanceTxDto) {
    const { page = 1, pageSize = 20, userId, type } = query;
    const where: Record<string, unknown> = {};
    if (userId) where['userId'] = BigInt(userId);
    if (type) where['type'] = type;

    const [list, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.balanceTransaction.count({ where }),
    ]);

    return paginate(
      list.map((tx) => ({
        id: tx.id.toString(),
        userId: tx.userId.toString(),
        type: tx.type,
        direction: tx.direction,
        amountCents: tx.amountCents.toString(),
        amountYuan: centsToYuan(tx.amountCents),
        balanceAfterCents: tx.balanceAfterCents.toString(),
        balanceAfterYuan: centsToYuan(tx.balanceAfterCents),
        relatedType: tx.relatedType,
        relatedNo: tx.relatedNo,
        description: tx.description,
        createdAt: toBeijing(tx.createdAt),
      })),
      total,
      page,
      pageSize,
    );
  }

  @Get('recharge-orders')
  @RequirePermissions('storedvalue:read')
  @ApiOperation({ summary: '充值订单列表' })
  async getRechargeOrders(@Query() query: QueryRechargeDto) {
    return this.rechargeService.findRechargeOrders(query);
  }

  @Get('recalculate/:jobId')
  @RequirePermissions('storedvalue:level-config')
  @ApiOperation({ summary: '查询等级重算进度' })
  async getRecalcProgress(@Param('jobId') jobId: string) {
    const jobIdNum = parseInt(jobId, 10);
    // 优先从内存进度 Map 获取（运行中的任务）
    const memProgress = this.levelRecalcService.getProgress?.(jobIdNum);
    if (memProgress) return memProgress;

    // 从数据库获取（已完成/失败的任务）
    const job = await this.prisma.levelRecalcJob.findUnique({
      where: { id: BigInt(jobIdNum) },
      select: { id: true, status: true, totalUsers: true, affectedUsers: true, startedAt: true, finishedAt: true },
    });
    if (!job) return { message: '重算任务不存在' };
    return {
      jobId: job.id.toString(),
      status: job.status,
      totalUsers: job.totalUsers,
      affectedUsers: job.affectedUsers,
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
    };
  }
}
