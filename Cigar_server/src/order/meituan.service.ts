import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 美团收银对接 — 一期为 Stub，真实对接需商户备案后启用 */
@Injectable()
export class MeituanService {
  private readonly logger = new Logger(MeituanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 推送订单到美团（Stub） */
  async pushOrder(orderId: bigint): Promise<{ meituanOrderNo?: string; redirectUrl?: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, meituanSyncStatus: true },
    });

    if (!order) {
      this.logger.warn(`订单 ${orderId} 不存在`);
      return {};
    }

    // Stub: 返回模拟数据
    const mockMeituanOrderNo = `MT${Date.now()}`;
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        meituanOrderNo: mockMeituanOrderNo,
        meituanSyncStatus: 'synced',
        meituanSyncAt: new Date(),
        status: 'settling',
      },
    });

    this.logger.log(`[Stub] 订单 ${order.orderNo} 已推送到美团`);

    return {
      meituanOrderNo: mockMeituanOrderNo,
      redirectUrl: `https://meituan-mock.com/pay/${mockMeituanOrderNo}`,
    };
  }

  /** 查询美团订单状态（Stub） */
  async queryOrderStatus(meituanOrderNo: string): Promise<string> {
    this.logger.log(`[Stub] 查询美团订单 ${meituanOrderNo}`);
    return 'PAID';
  }
}
