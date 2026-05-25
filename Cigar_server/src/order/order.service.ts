import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { CartService } from '../cart/cart.service';
import { MetricsService } from '../metrics/metrics.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { centsToYuan } from '../common/utils/money';
import { generateOrderNo } from '../common/utils/id-generator';
import { OrderStateMachine } from './order-state-machine';
import { paginate, type PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly cartService: CartService,
    private readonly metrics: MetricsService,
  ) {}

  /** 创建订单（幂等、库存预占、价格快照） */
  async createOrder(
    userId: bigint,
    dto: { items: { productType: string; productId: number; spec?: string; qty: number }[]; remark?: string },
    idempotencyKey: string,
  ) {
    // 幂等检查 — Redis
    const idemKey = `idem:order:${userId}:${idempotencyKey}`;
    const cached = await this.redis.get(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      return { idempotent: true, ...data };
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单商品不能为空');
    }

    const orderNo = generateOrderNo();

    const result = await this.prisma.$transaction(async (tx) => {
      // 检查 DB 幂等
      const existing = await tx.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (existing) {
        return { idempotent: true, orderNo: existing.orderNo, orderId: existing.id.toString() };
      }

      // 拉取商品信息并锁库存
      const cigarIds = dto.items.filter(i => i.productType === 'cigar').map(i => BigInt(i.productId));
      const drinkIds = dto.items.filter(i => i.productType === 'drink').map(i => BigInt(i.productId));

      const [cigars, drinks] = await Promise.all([
        cigarIds.length > 0
          ? tx.$queryRawUnsafe<Array<{
              id: bigint; name: string; brand: string; spec: string;
              price_cents: bigint; member_price_cents: bigint;
              stock: number; stock_locked: number; thumb_url: string | null; status: string;
            }>>(
              `SELECT id, name, brand, spec, price_cents, member_price_cents, stock, stock_locked, thumb_url, status FROM cigars WHERE id = ANY($1::bigint[]) FOR UPDATE`,
              cigarIds,
            )
          : Promise.resolve([]),
        drinkIds.length > 0
          ? tx.$queryRawUnsafe<Array<{
              id: bigint; name: string;
              price_cents: bigint; member_price_cents: bigint;
              stock: number; stock_locked: number; thumb_url: string | null; status: string;
            }>>(
              `SELECT id, name, price_cents, member_price_cents, stock, stock_locked, thumb_url, status FROM drinks WHERE id = ANY($1::bigint[]) FOR UPDATE`,
              drinkIds,
            )
          : Promise.resolve([]),
      ]);

      const productMap = new Map<string, any>();
      for (const c of cigars) productMap.set(`cigar:${c.id}`, c);
      for (const d of drinks) productMap.set(`drink:${d.id}`, d);

      // 校验
      let totalCents = BigInt(0);
      let discountCents = BigInt(0);
      const orderItems: Array<{
        productType: string;
        productId: bigint;
        nameSnapshot: string;
        specSnapshot: string;
        priceCentsSnapshot: bigint;
        memberPriceSnapshot: bigint;
        qty: number;
        actualAmountCents: bigint;
        thumbUrlSnapshot: string | null;
      }> = [];

      for (const item of dto.items) {
        const key = `${item.productType}:${BigInt(item.productId)}`;
        const product = productMap.get(key);

        if (!product) {
          throw new BusinessException(ErrorCode.VALIDATION_FAILED, `商品 ${item.productType}#${item.productId} 不存在`);
        }
        if (product.status !== 'active') {
          throw new BusinessException(ErrorCode.PRODUCT_OFFLINE, `"${product.name}" 已下架`);
        }

        const available = (product.stock as number) - (product.stock_locked as number);
        if (available < item.qty) {
          throw new BusinessException(ErrorCode.STOCK_INSUFFICIENT, `"${product.name}" 库存不足（可售 ${available} 件）`);
        }

        const origPrice = product.price_cents as bigint;
        const memberPrice = product.member_price_cents as bigint;
        const lineTotal = memberPrice * BigInt(item.qty);
        const lineOrigTotal = origPrice * BigInt(item.qty);

        totalCents += lineTotal;
        discountCents += (lineOrigTotal - lineTotal);

        orderItems.push({
          productType: item.productType,
          productId: product.id,
          nameSnapshot: product.name,
          specSnapshot: item.spec ?? product.spec ?? '单支',
          priceCentsSnapshot: origPrice,
          memberPriceSnapshot: memberPrice,
          qty: item.qty,
          actualAmountCents: lineTotal,
          thumbUrlSnapshot: product.thumb_url ?? null,
        });
      }

      // 预占库存
      for (const item of dto.items) {
        if (item.productType === 'cigar') {
          await tx.$executeRawUnsafe(
            `UPDATE cigars SET stock_locked = stock_locked + $1, updated_at = now() WHERE id = $2 AND stock - stock_locked >= $1`,
            item.qty, item.productId,
          );
        } else {
          await tx.$executeRawUnsafe(
            `UPDATE drinks SET stock_locked = stock_locked + $1, updated_at = now() WHERE id = $2 AND stock - stock_locked >= $1`,
            item.qty, item.productId,
          );
        }
      }

      // 获取用户名快照
      const user = await tx.user.findUnique({ where: { id: userId }, select: { nickname: true } });

      // 创建订单
      const order = await tx.order.create({
        data: {
          orderNo,
          idempotencyKey,
          userId,
          userNameSnapshot: user?.nickname ?? '微信用户',
          totalCents,
          memberDiscountCents: discountCents,
          actualPayCents: totalCents,
          status: 'pending',
          payMethod: null,
          remark: dto.remark ?? null,
          expireAt: new Date(Date.now() + 30 * 60 * 1000),
          meituanSyncStatus: 'not_required',
          orderItems: {
            create: orderItems.map(oi => ({
              productType: oi.productType,
              productId: oi.productId,
              nameSnapshot: oi.nameSnapshot,
              specSnapshot: oi.specSnapshot,
              priceCentsSnapshot: oi.priceCentsSnapshot,
              memberPriceSnapshot: oi.memberPriceSnapshot,
              qty: oi.qty,
              actualAmountCents: oi.actualAmountCents,
              thumbUrlSnapshot: oi.thumbUrlSnapshot,
            })),
          },
        },
        include: { orderItems: true },
      });

      return {
        idempotent: false,
        orderId: order.id.toString(),
        orderNo: order.orderNo,
        totalCents: totalCents.toString(),
        totalYuan: centsToYuan(totalCents),
        discountCents: discountCents.toString(),
        discountYuan: centsToYuan(discountCents),
        actualPayCents: totalCents.toString(),
        actualPayYuan: centsToYuan(totalCents),
        status: order.status,
        expireAt: order.expireAt.toISOString(),
        items: order.orderItems.map(oi => ({
          productType: oi.productType,
          productId: oi.productId.toString(),
          name: oi.nameSnapshot,
          spec: oi.specSnapshot,
          qty: oi.qty,
          priceCents: oi.memberPriceSnapshot.toString(),
          priceYuan: centsToYuan(oi.memberPriceSnapshot),
        })),
      };
    });

    // 缓存幂等（非幂等命中时）
    if (!result.idempotent) {
      await this.redis.set(idemKey, JSON.stringify(result), 600);
      this.metrics.ordersCreatedTotal.inc({ pay_method: 'balance' });
    }

    // 仅清除本次下单的购物车商品（保留其他商品）
    if (!result.idempotent) {
      await this.cartService.clearCartItems(userId, dto.items);
    }

    return result;
  }

  /** 用户取消订单（仅 pending） */
  async cancelOrder(userId: bigint, orderId: number, reason?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.$queryRawUnsafe<Array<{
        id: bigint; status: string; pay_method: string | null;
      }>>(
        `SELECT id, status, pay_method FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE NOWAIT`,
        orderId, userId,
      );
      if (!order || order.length === 0) {
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
      }

      const o = order[0];
      if (!OrderStateMachine.canTransit(o.status, 'cancelled')) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_FORBIDDEN, `当前状态 ${o.status} 不允许取消`);
      }

      // 释放预占库存（防负数：使用 GREATEST 确保 stock_locked 不低于 0）
      const items = await tx.orderItem.findMany({ where: { orderId: BigInt(orderId) } });
      for (const item of items) {
        if (item.productType === 'cigar') {
          await tx.$executeRawUnsafe(
            `UPDATE cigars SET stock_locked = GREATEST(0, stock_locked - $1), updated_at = now() WHERE id = $2`,
            item.qty, item.productId,
          );
        } else {
          await tx.$executeRawUnsafe(
            `UPDATE drinks SET stock_locked = GREATEST(0, stock_locked - $1), updated_at = now() WHERE id = $2`,
            item.qty, item.productId,
          );
        }
      }

      // 关闭关联的 pending 支付单
      await tx.paymentRecord.updateMany({
        where: { orderId: BigInt(orderId), status: 'pending' },
        data: { status: 'closed' },
      });

      await tx.order.update({
        where: { id: BigInt(orderId) },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason ?? '用户取消',
        },
      });

      return { orderNo: null };
    });

    this.metrics.ordersCancelledTotal.inc({ reason: reason ?? 'user_cancel' });
    return { cancelled: true };
  }

  /** 用户订单列表 */
  async getUserOrders(
    userId: bigint,
    query: { status?: string; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true, orderNo: true, status: true,
          totalCents: true, actualPayCents: true, refundedAmountCents: true,
          payMethod: true,
          createdAt: true, paidAt: true, completedAt: true,
          orderItems: {
            select: {
              nameSnapshot: true, specSnapshot: true, qty: true,
              memberPriceSnapshot: true, thumbUrlSnapshot: true,
            },
          },
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
      status: o.status,
      totalCents: o.totalCents.toString(),
      totalYuan: centsToYuan(o.totalCents),
      actualPayCents: o.actualPayCents.toString(),
      actualPayYuan: centsToYuan(o.actualPayCents),
      refundedCents: o.refundedAmountCents.toString(),
      refundedYuan: centsToYuan(o.refundedAmountCents),
      payMethod: o.payMethod,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      completedAt: o.completedAt?.toISOString() ?? null,
      items: o.orderItems.map(i => ({
        name: i.nameSnapshot,
        spec: i.specSnapshot,
        qty: i.qty,
        priceYuan: centsToYuan(i.memberPriceSnapshot),
        thumbUrl: i.thumbUrlSnapshot,
      })),
    }));

    return paginate(list, total, page, pageSize);
  }

  /** 用户订单详情 */
  async getOrderDetail(userId: bigint, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(orderId), userId },
      include: {
        orderItems: true,
        paymentRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        refundRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '订单不存在');
    }

    return {
      orderId: order.id.toString(),
      orderNo: order.orderNo,
      status: order.status,
      totalCents: order.totalCents.toString(),
      totalYuan: centsToYuan(order.totalCents),
      discountCents: order.memberDiscountCents.toString(),
      discountYuan: centsToYuan(order.memberDiscountCents),
      actualPayCents: order.actualPayCents.toString(),
      actualPayYuan: centsToYuan(order.actualPayCents),
      refundedCents: order.refundedAmountCents.toString(),
      refundedYuan: centsToYuan(order.refundedAmountCents),
      payMethod: order.payMethod,
      remark: order.remark,
      expireAt: order.expireAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      cancelReason: order.cancelReason,
      items: order.orderItems.map(i => ({
        productType: i.productType,
        productId: i.productId.toString(),
        name: i.nameSnapshot,
        spec: i.specSnapshot,
        qty: i.qty,
        origPriceCents: i.priceCentsSnapshot.toString(),
        origPriceYuan: centsToYuan(i.priceCentsSnapshot),
        memberPriceCents: i.memberPriceSnapshot.toString(),
        memberPriceYuan: centsToYuan(i.memberPriceSnapshot),
        actualAmountCents: i.actualAmountCents.toString(),
        actualAmountYuan: centsToYuan(i.actualAmountCents),
        thumbUrl: i.thumbUrlSnapshot,
      })),
      lastPayment: order.paymentRecords[0] ? {
        paymentNo: order.paymentRecords[0].paymentNo,
        channel: order.paymentRecords[0].channel,
        status: order.paymentRecords[0].status,
        amountCents: order.paymentRecords[0].amountCents.toString(),
      } : null,
      refunds: order.refundRecords.map(r => ({
        refundNo: r.refundNo,
        amountCents: r.amountCents.toString(),
        amountYuan: centsToYuan(r.amountCents),
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
