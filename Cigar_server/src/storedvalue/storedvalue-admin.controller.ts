import { Controller, Get, Post, Query, Body, Req, Headers, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdjustService } from './adjust.service';
import { RechargeService } from './recharge.service';
import { PrismaService } from '../prisma/prisma.service';
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
    return this.adjustService.adjustBalance(
      BigInt(user.sub),
      user.sub,
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
    return { message: `查询 jobId=${jobId} 进度（暂存内存）` };
  }
}
