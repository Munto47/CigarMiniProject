import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { Public } from '../common/decorators/public.decorator';
import * as crypto from 'crypto';

@ApiTags('payment')
@Controller('payment')
export class MeituanCallbackController {
  private readonly logger = new Logger(MeituanCallbackController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Post('meituan-callback')
  @ApiOperation({ summary: '美团支付回调（验签 + 幂等）' })
  async handleCallback(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ) {
    const orderNo = body['out_trade_no'] as string;
    const meituanOrderNo = (body['meituan_order_no'] as string) ?? orderNo;
    const tradeState = (body['trade_state'] as string) ?? 'SUCCESS';
    const externalId = meituanOrderNo;

    this.logger.log(`美团回调: order=${orderNo}, meituan=${meituanOrderNo}, state=${tradeState}`);

    if (!orderNo) {
      return { code: 'FAIL', message: '缺少 out_trade_no' };
    }

    // 签名验证（生产环境，可配置跳过）
    const skipVerify = this.config.get<string>('MEITUAN_SKIP_SIGN_VERIFY', 'false') === 'true';
    if (!skipVerify) {
      const sigHeader = headers['x-meituan-signature'] || headers['signature'] || '';
      const appSecret = this.config.get<string>('MEITUAN_APP_SECRET', '');
      if (appSecret && sigHeader) {
        const payload = JSON.stringify(body);
        const expected = crypto
          .createHmac('sha256', appSecret)
          .update(payload)
          .digest('hex');
        if (sigHeader !== expected) {
          // 验签失败：记录回调但不处理业务
          await this.storeCallback('meituan', externalId, body, false, false);
          this.logger.error('美团回调验签失败');
          return { code: 'FAIL', message: '签名验证失败' };
        }
      }
    }

    // 幂等存储回调日志
    try {
      await this.prisma.paymentCallback.create({
        data: {
          channel: 'meituan',
          externalId,
          relatedType: 'order',
          relatedNo: orderNo,
          rawPayload: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
          verified: true,
          processed: false,
        },
      });
    } catch {
      // 重复回调 — 检查是否已处理
      const existing = await this.prisma.paymentCallback.findUnique({
        where: {
          channel_externalId: { channel: 'meituan', externalId },
        },
      });
      if (existing?.processed) {
        this.metrics.paymentCallbacksReceivedTotal.inc({ channel: 'meituan', is_replay: 'true' });
        return { code: 'SUCCESS', message: '已处理（幂等）' };
      }
    }

    // 更新订单状态
    if (tradeState === 'SUCCESS') {
      await this.prisma.order.updateMany({
        where: {
          orderNo,
          status: 'pending',
          payMethod: 'meituan',
        },
        data: {
          status: 'settling',
          meituanOrderNo,
          meituanSyncStatus: 'synced',
          meituanSyncAt: new Date(),
          paidAt: new Date(),
        },
      });
    }

    // 标记回调已处理
    await this.prisma.paymentCallback.updateMany({
      where: { channel: 'meituan', externalId },
      data: {
        processed: true,
        processedAt: new Date(),
        processResult: tradeState === 'SUCCESS' ? 'synced' : 'payment_failed',
      },
    });

    this.logger.log(`美团回调处理完成: ${orderNo}`);
    this.metrics.paymentCallbacksReceivedTotal.inc({ channel: 'meituan', is_replay: 'false' });
    if (tradeState === 'SUCCESS') {
      this.metrics.ordersPaidTotal.inc({ channel: 'meituan' });
    }
    return { code: 'SUCCESS' };
  }

  /** 存储回调原始报文 */
  private async storeCallback(
    channel: string,
    externalId: string,
    rawPayload: any,
    verified: boolean,
    processed: boolean,
  ) {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO payment_callbacks (channel, external_id, raw_payload, verified, processed, received_count)
         VALUES ($1, $2, $3::jsonb, $4, $5, 1)
         ON CONFLICT (channel, external_id)
         DO UPDATE SET received_count = payment_callbacks.received_count + 1, updated_at = NOW()`,
        channel,
        externalId,
        JSON.stringify(rawPayload),
        verified,
        processed,
      );
    } catch (err) {
      this.logger.error(`存储回调失败: channel=${channel} externalId=${externalId}`, err);
    }
  }
}
