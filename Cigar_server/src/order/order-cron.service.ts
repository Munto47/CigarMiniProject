import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderCronService {
  private readonly logger = new Logger(OrderCronService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** 启动超时关闭扫描（每分钟） */
  start() {
    if (this.intervalId) return;
    this.logger.log('订单超时关闭扫描已启动（每 60s）');
    this.intervalId = setInterval(() => this.closeExpiredOrders(), 60_000);
    // 立即执行一次
    this.closeExpiredOrders();
  }

  /** 停止扫描 */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('订单超时关闭扫描已停止');
    }
  }

  /** 超时关闭订单（SKIP LOCKED + 30s 安全边界） */
  async closeExpiredOrders() {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 选取超时订单（30s 安全边界，SKIP LOCKED 避免与正在支付的订单互锁）
        const expiredRows = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(
          `SELECT id FROM orders
            WHERE status = 'pending'
              AND expire_at < now() - INTERVAL '30 seconds'
            ORDER BY expire_at
            LIMIT 200
            FOR UPDATE SKIP LOCKED`,
        );

        if (expiredRows.length === 0) return 0;

        const ids = expiredRows.map(r => r.id);

        // 回退预占库存
        const items = await tx.orderItem.findMany({
          where: { orderId: { in: ids } },
        });

        for (const item of items) {
          if (item.productType === 'cigar') {
            await tx.$executeRawUnsafe(
              `UPDATE cigars SET stock_locked = stock_locked - $1, updated_at = now() WHERE id = $2`,
              item.qty, item.productId,
            );
          } else {
            await tx.$executeRawUnsafe(
              `UPDATE drinks SET stock_locked = stock_locked - $1, updated_at = now() WHERE id = $2`,
              item.qty, item.productId,
            );
          }
        }

        // 关闭订单
        await tx.$executeRawUnsafe(
          `UPDATE orders SET status = 'cancelled', cancelled_at = now(), cancel_reason = '超时未支付', updated_at = now()
            WHERE id = ANY($1::bigint[])`,
          ids,
        );

        // 关闭支付单
        await tx.paymentRecord.updateMany({
          where: { orderId: { in: ids }, status: 'pending' },
          data: { status: 'closed' },
        });

        return expiredRows.length;
      });

      if (result > 0) {
        this.logger.log(`超时关闭 ${result} 笔订单`);
      }
    } catch (err) {
      this.logger.error('超时关闭订单失败', err instanceof Error ? err.message : String(err));
    }
  }
}
