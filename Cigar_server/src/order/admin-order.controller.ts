import {
  Controller, Get, Post, Patch, Param, Body, Query, Headers, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';
import { MeituanService } from './meituan.service';
import { QueryOrderDto } from './dto/query-order.dto';
import { RefundDto } from './dto/refund.dto';
import { UpdateOrderStatusDto } from './dto/status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { paginate } from '../common/dto/pagination.dto';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@Controller('admin/orders')
export class AdminOrderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly refundService: RefundService,
    private readonly meituanService: MeituanService,
  ) {}

  @Get()
  @ApiOperation({ summary: '管理端订单列表' })
  @RequirePermissions('order:read')
  async listOrders(@Query() query: QueryOrderDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true, orderNo: true, userId: true, userNameSnapshot: true,
          status: true, totalCents: true, actualPayCents: true,
          refundedAmountCents: true, payMethod: true,
          meituanSyncStatus: true,
          createdAt: true, paidAt: true, completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    const list = orders.map(o => ({
      orderId: o.id.toString(),
      orderNo: o.orderNo,
      userId: o.userId.toString(),
      userName: o.userNameSnapshot,
      status: o.status,
      totalCents: o.totalCents.toString(),
      totalYuan: centsToYuan(o.totalCents),
      actualPayCents: o.actualPayCents.toString(),
      actualPayYuan: centsToYuan(o.actualPayCents),
      refundedCents: o.refundedAmountCents.toString(),
      refundedYuan: centsToYuan(o.refundedAmountCents),
      payMethod: o.payMethod,
      meituanSyncStatus: o.meituanSyncStatus,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      completedAt: o.completedAt?.toISOString() ?? null,
    }));

    return paginate(list, total, page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: '管理端订单详情（含用户/明细/支付/退款/同步状态）' })
  @RequirePermissions('order:read')
  async getOrderDetail(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
      include: {
        orderItems: true,
        paymentRecords: { orderBy: { createdAt: 'desc' } },
        refundRecords: { orderBy: { createdAt: 'desc' } },
        user: {
          select: {
            id: true, nickname: true, phoneMask: true,
            memberProfile: {
              select: { rechargeLevel: true, consumptionLevel: true, balanceCents: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
    }

    return {
      order: {
        id: order.id.toString(),
        orderNo: order.orderNo,
        status: order.status,
        totalCents: order.totalCents.toString(),
        totalYuan: centsToYuan(order.totalCents),
        memberDiscountCents: order.memberDiscountCents.toString(),
        memberDiscountYuan: centsToYuan(order.memberDiscountCents),
        actualPayCents: order.actualPayCents.toString(),
        actualPayYuan: centsToYuan(order.actualPayCents),
        refundedAmountCents: order.refundedAmountCents.toString(),
        refundedYuan: centsToYuan(order.refundedAmountCents),
        payMethod: order.payMethod,
        remark: order.remark,
        expireAt: order.expireAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() ?? null,
        completedAt: order.completedAt?.toISOString() ?? null,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        cancelReason: order.cancelReason,
      },
      user: {
        id: order.user.id.toString(),
        nickname: order.user.nickname,
        phoneMask: order.user.phoneMask,
        rechargeLevel: order.user.memberProfile?.rechargeLevel ?? 1,
        consumptionLevel: order.user.memberProfile?.consumptionLevel ?? 1,
        balanceCents: order.user.memberProfile?.balanceCents.toString() ?? '0',
      },
      items: order.orderItems.map(i => ({
        productType: i.productType,
        productId: i.productId.toString(),
        name: i.nameSnapshot,
        spec: i.specSnapshot,
        qty: i.qty,
        priceCentsSnapshot: i.priceCentsSnapshot.toString(),
        memberPriceSnapshot: i.memberPriceSnapshot.toString(),
        actualAmountCents: i.actualAmountCents.toString(),
        actualAmountYuan: centsToYuan(i.actualAmountCents),
      })),
      payments: order.paymentRecords.map(p => ({
        paymentNo: p.paymentNo,
        channel: p.channel,
        status: p.status,
        amountCents: p.amountCents.toString(),
        amountYuan: centsToYuan(p.amountCents),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
      refunds: order.refundRecords.map(r => ({
        refundNo: r.refundNo,
        amountCents: r.amountCents.toString(),
        amountYuan: centsToYuan(r.amountCents),
        channel: r.channel,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      meituan: {
        syncStatus: order.meituanSyncStatus,
        retryCount: order.meituanRetryCount,
        nextRetryAt: order.meituanNextRetryAt?.toISOString() ?? null,
        syncAt: order.meituanSyncAt?.toISOString() ?? null,
      },
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '修改订单状态' })
  @RequirePermissions('order:write')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
    }

    const validTransitions: Record<string, string[]> = {
      paid: ['completed'],
      settling: ['completed'],
    };

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_FORBIDDEN,
        `不允许从 ${order.status} 转换到 ${dto.status}`);
    }

    const updateData: any = { status: dto.status };
    if (dto.status === 'completed') {
      updateData.completedAt = new Date();
    }
    if (dto.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = dto.reason ?? '管理员取消';
    }

    await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return { orderId: id, status: dto.status };
  }

  @Post(':id/refund')
  @ApiOperation({ summary: '发起退款' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '幂等键' })
  @RequirePermissions('order:refund')
  async refund(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: RefundDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    if (!idempotencyKey) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '缺少 Idempotency-Key 请求头');
    }
    return this.refundService.processRefund(
      BigInt(admin.sub),
      admin.uname ?? 'admin',
      Number(id),
      dto,
      idempotencyKey,
      req.ip,
      req.headers?.['user-agent'],
    );
  }

  @Post('sync-meituan')
  @ApiOperation({ summary: '手动同步美团订单' })
  @RequirePermissions('order:write')
  async syncMeituan(@Body() body: { orderId?: number }) {
    if (!body.orderId) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '请提供 orderId');
    }
    const result = await this.meituanService.pushOrder(BigInt(body.orderId));
    return result;
  }
}
