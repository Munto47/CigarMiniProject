import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

/**
 * 美团收银对接
 * 当前为未完成状态（Stub），需要向美团商家平台申请以下凭据后方可启用：
 *   - MEITUAN_APP_ID / MEITUAN_APP_SECRET（美团开放平台）
 *   - MEITUAN_SHOP_ID（门店 ID）
 * 启用条件：配置 MEITUAN_ENABLED=true 并提供完整凭据
 */
@Injectable()
export class MeituanService {
  private readonly logger = new Logger(MeituanService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.enabled = config.get<string>('MEITUAN_ENABLED', 'false') === 'true';
  }

  /** 推送订单到美团 */
  async pushOrder(orderId: bigint): Promise<{ meituanOrderNo?: string; redirectUrl?: string }> {
    if (!this.enabled) {
      throw new BusinessException(ErrorCode.MEITUAN_API_ERROR, '美团支付暂未开通');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, meituanSyncStatus: true },
    });

    if (!order) {
      this.logger.warn(`订单 ${orderId} 不存在`);
      return {};
    }

    // TODO: 实现真实的美团订单推送 API 调用
    // const result = await this.callMeituanApi('/order/push', { ... });
    // await this.prisma.order.update({
    //   where: { id: orderId },
    //   data: {
    //     meituanOrderNo: result.meituanOrderNo,
    //     meituanSyncStatus: 'synced',
    //     meituanSyncAt: new Date(),
    //     status: 'settling',
    //   },
    // });
    // return { meituanOrderNo: result.meituanOrderNo, redirectUrl: result.redirectUrl };

    this.logger.warn(`美团支付未实现：订单 ${order.orderNo} 无法推送到美团`);
    throw new BusinessException(ErrorCode.MEITUAN_API_ERROR, '美团支付对接尚未完成');
  }

  /** 查询美团订单状态 */
  async queryOrderStatus(meituanOrderNo: string): Promise<string> {
    if (!this.enabled) {
      throw new BusinessException(ErrorCode.MEITUAN_API_ERROR, '美团支付暂未开通');
    }

    // TODO: 实现真实的美团订单查询 API 调用
    this.logger.warn(`美团支付查询未实现: ${meituanOrderNo}`);
    throw new BusinessException(ErrorCode.MEITUAN_API_ERROR, '美团支付对接尚未完成');
  }
}
