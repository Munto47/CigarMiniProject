import { Controller, Post, Body, Req, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';
import { RechargeService } from './recharge.service';
import { MetricsService } from '../metrics/metrics.service';
import { Public } from '../common/decorators/public.decorator';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import * as crypto from 'crypto';

@ApiTags('payment')
@Controller('payment')
export class WechatCallbackController {
  private readonly logger = new Logger(WechatCallbackController.name);

  constructor(
    private readonly rechargeService: RechargeService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Post('wechat-callback')
  @ApiOperation({ summary: '微信支付回调（验签 + 幂等 + 入账）' })
  async handleCallback(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() rawBody: any,
  ) {
    const mockMode = this.config.get<string>('WECHAT_MOCK_MODE', 'true') === 'true';

    let outTradeNo: string;
    let transactionId: string;
    let amountTotal: number;
    let tradeState: string;
    let externalId: string;

    if (mockMode) {
      // Mock 模式：直接从 body 取字段（开发环境）
      const body = rawBody as Record<string, unknown>;
      outTradeNo = body['out_trade_no'] as string;
      transactionId = (body['transaction_id'] as string) ?? 'mock_txn';
      amountTotal = Number(body['amount']?.['total'] ?? body['amount_total'] ?? 0);
      tradeState = (body['trade_state'] as string) ?? 'SUCCESS';
      externalId = transactionId;
    } else {
      // 生产环境：验签 + 解密 resource.ciphertext（Plan.md §7.3）
      const signature = headers['wechatpay-signature'];
      const serial = headers['wechatpay-serial'];
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];

      if (!signature || !serial || !timestamp || !nonce) {
        this.logger.warn('微信回调缺少签名头');
        return { code: 'FAIL', message: '缺少签名参数' };
      }

      // 微信支付公钥方案：Wechatpay-Serial 头必须等于已配置的 PUB_KEY_ID
      // （旧版平台证书方案下 serial 是证书序列号，需多证书路由；新版公钥固定一个 ID，不会过期）
      const expectedPubKeyId = this.config.get<string>('WECHAT_PAY_PUB_KEY_ID', '');
      if (expectedPubKeyId && serial !== expectedPubKeyId) {
        this.logger.error(`微信回调 Wechatpay-Serial 不匹配: received=${serial} expected=${expectedPubKeyId}`);
        this.metrics.paymentCallbackVerifyFailedTotal.inc({ channel: 'wechat' });
        return { code: 'FAIL', message: '验签密钥不匹配' };
      }

      // 时间戳防回放（容差 5 分钟，与微信官方一致）
      const tsNum = Number(timestamp);
      const nowSec = Math.floor(Date.now() / 1000);
      if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 300) {
        this.logger.warn(`微信回调时间戳超出容差: ts=${timestamp} now=${nowSec}`);
        return { code: 'FAIL', message: '时间戳超出有效期' };
      }

      // 防重放：nonce 在 24h 内只能出现一次（微信最长重试窗口）
      const nonceKey = `wxpay:nonce:${nonce}`;
      const nonceExists = await this.redis.get(nonceKey);
      if (nonceExists) {
        this.logger.warn(`微信回调 nonce 重放: ${nonce}`);
        this.metrics.paymentCallbacksReceivedTotal.inc({ channel: 'wechat', is_replay: 'true' });
        return { code: 'SUCCESS', message: 'OK (replay)' };
      }
      await this.redis.set(nonceKey, '1', 86400);

      // 验签：使用平台证书公钥验证 RSA-SHA256 签名
      // 必须使用原始 HTTP 报文字节，JSON.stringify 会改变字段顺序/空格导致验签失败
      const rawBodyStr = (req as any).rawBody
        ? (req as any).rawBody.toString('utf-8')
        : JSON.stringify(rawBody);
      const message = `${timestamp}\n${nonce}\n${rawBodyStr}\n`;
      const platformCert = this.config.get<string>('WECHAT_PLATFORM_CERT', '');
      if (!platformCert) {
        this.logger.error('微信平台证书未配置');
        return { code: 'FAIL', message: '平台证书未配置' };
      }

      const valid = crypto.verify(
        'RSA-SHA256',
        Buffer.from(message, 'utf-8'),
        {
          key: platformCert,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(signature, 'base64'),
      );

      if (!valid) {
        // 验签失败：记录回调但不处理业务
        await this.storeCallback('wechat', rawBody.id || 'unknown', rawBody, false, false);
        this.logger.error('微信回调验签失败');
        this.metrics.paymentCallbackVerifyFailedTotal.inc({ channel: 'wechat' });
        return { code: 'FAIL', message: '签名验证失败' };
      }

      // 解密 resource.ciphertext（AES-256-GCM）
      const resource = rawBody?.resource;
      if (!resource?.ciphertext) {
        this.logger.error('微信回调缺少 resource.ciphertext');
        return { code: 'FAIL', message: '缺少加密数据' };
      }

      const apiV3Key = this.config.get<string>('WECHAT_API_V3_KEY', '');
      let decrypted: any;
      try {
        const decoded = Buffer.from(resource.ciphertext, 'base64');
        // ciphertext = 密文 || 认证标签（最后 16 字节）
        const authTag = decoded.subarray(decoded.length - 16);
        const encryptedData = decoded.subarray(0, decoded.length - 16);
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          Buffer.from(apiV3Key, 'utf-8').subarray(0, 32),
          Buffer.from(resource.nonce || '', 'utf-8').subarray(0, 12),
        ) as crypto.DecipherGCM;
        decipher.setAuthTag(authTag);
        if (resource.associated_data) {
          decipher.setAAD(Buffer.from(resource.associated_data, 'utf-8'));
        }
        const plaintext = Buffer.concat([
          decipher.update(encryptedData),
          decipher.final(),
        ]).toString('utf-8');
        decrypted = JSON.parse(plaintext);
      } catch (err) {
        this.logger.error('AES-256-GCM 解密回调失败', err);
        return { code: 'FAIL', message: '解密失败' };
      }

      // 解密后必须校验 appid + mchid，防御伪造/串号
      const expectedAppId = this.config.get<string>('WECHAT_APP_ID', '');
      const expectedMchId = this.config.get<string>('WECHAT_MCH_ID', '');
      if (expectedAppId && decrypted.appid && decrypted.appid !== expectedAppId) {
        this.logger.error(`微信回调 appid 不匹配: ${decrypted.appid} vs ${expectedAppId}`);
        return { code: 'FAIL', message: 'appid 不匹配' };
      }
      if (expectedMchId && decrypted.mchid && decrypted.mchid !== expectedMchId) {
        this.logger.error(`微信回调 mchid 不匹配: ${decrypted.mchid} vs ${expectedMchId}`);
        return { code: 'FAIL', message: 'mchid 不匹配' };
      }

      outTradeNo = decrypted.out_trade_no;
      transactionId = decrypted.transaction_id;
      amountTotal = decrypted.amount?.total ?? decrypted.amount_total ?? 0;
      tradeState = decrypted.trade_state ?? 'SUCCESS';
      externalId = transactionId;

      // 写入回调日志表（幂等：唯一约束防重放 + received_count 自增）
      await this.storeCallback('wechat', externalId, rawBody, true, false);
    }

    if (!outTradeNo) {
      return { code: 'FAIL', message: '缺少 out_trade_no' };
    }

    const isReplay = tradeState === 'SUCCESS' && mockMode === false;
    this.metrics.paymentCallbacksReceivedTotal.inc({ channel: 'wechat', is_replay: 'false' });

    const result = await this.rechargeService.handlePaymentSuccess({
      outTradeNo,
      transactionId: transactionId ?? 'unknown',
      amountTotal,
      tradeState: tradeState ?? 'SUCCESS',
      success: tradeState === 'SUCCESS' || !tradeState,
    });

    if (result && !result.idempotent && !(result as any).skipped) {
      this.metrics.rechargesCompletedTotal.inc({ tier_id: 'unknown' });
    }

    // 标记回调已处理
    if (!mockMode) {
      await this.markCallbackProcessed('wechat', externalId);
    }

    return { code: 'SUCCESS', message: 'OK', result };
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

  /** 标记回调已处理 */
  private async markCallbackProcessed(channel: string, externalId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE payment_callbacks SET processed = TRUE, processed_at = NOW() WHERE channel = $1 AND external_id = $2`,
        channel,
        externalId,
      );
    } catch (err) {
      this.logger.error(`标记回调已处理失败: channel=${channel} externalId=${externalId}`, err);
    }
  }
}
