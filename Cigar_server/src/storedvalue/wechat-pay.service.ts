import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../infra/redis/redis.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { randomUUID, createHash, createSign } from 'crypto';
import axios from 'axios';

export interface WechatPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
  prepayId: string;
}

export interface WechatCallbackResult {
  outTradeNo: string;
  transactionId: string;
  tradeState: string;
  amountTotal: number;
  success: boolean;
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly mockMode: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.mockMode = config.get<string>('WECHAT_MOCK_MODE', 'false') === 'true';
  }

  /** 微信支付 JSAPI 下单 */
  async createJsapiOrder(params: {
    outTradeNo: string;
    amountCents: number;
    description: string;
    openid: string;
  }): Promise<WechatPayParams> {
    if (this.mockMode) {
      return this.mockCreateOrder(params.outTradeNo);
    }

    const appId = this.config.get<string>('WECHAT_APP_ID')!;
    const mchId = this.config.get<string>('WECHAT_MCH_ID')!;

    const body = {
      appid: appId,
      mchid: mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: this.config.get<string>('WECHAT_NOTIFY_URL')!,
      amount: { total: params.amountCents, currency: 'CNY' },
      payer: { openid: params.openid },
    };

    try {
      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi',
        body,
        { headers: await this.getHeaders('POST', '/v3/pay/transactions/jsapi', body) },
      );

      const prepayId = response.data.prepay_id as string;
      return this.buildPayParams(appId, prepayId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`微信支付下单失败: ${msg}`);
      throw new BusinessException(ErrorCode.WECHAT_PAY_API_ERROR, '微信支付下单失败');
    }
  }

  /** 查询订单状态（回调丢失兜底） */
  async queryOrder(outTradeNo: string): Promise<WechatCallbackResult | null> {
    if (this.mockMode) return null;

    try {
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.get<string>('WECHAT_MCH_ID')}`;
      const response = await axios.get(`https://api.mch.weixin.qq.com${url}`, {
        headers: await this.getHeaders('GET', url, null),
      });

      const data = response.data;
      return {
        outTradeNo: data.out_trade_no,
        transactionId: data.transaction_id,
        tradeState: data.trade_state,
        amountTotal: data.amount?.total ?? 0,
        success: data.trade_state === 'SUCCESS',
      };
    } catch {
      return null;
    }
  }

  /** 构建前端调起支付参数 */
  private buildPayParams(appId: string, prepayId: string): WechatPayParams {
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomUUID().replace(/-/g, '').slice(0, 32);
    const pkg = `prepay_id=${prepayId}`;

    const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const privateKey = this.config.get<string>('WECHAT_MERCHANT_PRIVATE_KEY')!;
    if (!privateKey) {
      throw new Error('微信支付商户私钥未配置 (WECHAT_MERCHANT_PRIVATE_KEY)');
    }

    const sign = createSign('RSA-SHA256');
    sign.update(signStr);
    const paySign = sign.sign(privateKey, 'base64');

    return { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign, prepayId };
  }

  /** 微信 API v3 签名头（RSA-SHA256） */
  private async getHeaders(method: string, path: string, body: unknown) {
    const mchId = this.config.get<string>('WECHAT_MCH_ID')!;
    const serialNo = this.config.get<string>('WECHAT_SERIAL_NO')!;
    const nonceStr = randomUUID().replace(/-/g, '').slice(0, 32);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bodyStr = body ? JSON.stringify(body) : '';

    const signStr = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
    const privateKey = this.config.get<string>('WECHAT_MERCHANT_PRIVATE_KEY')!;
    if (!privateKey) {
      throw new Error('微信支付商户私钥未配置 (WECHAT_MERCHANT_PRIVATE_KEY)');
    }

    const sign = createSign('RSA-SHA256');
    sign.update(signStr);
    const signature = sign.sign(privateKey, 'base64');

    return {
      Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /** Mock 模式：返回模拟支付参数 */
  private mockCreateOrder(outTradeNo: string): WechatPayParams {
    const prepayId = `prepay_mock_${outTradeNo}`;
    return {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: randomUUID().replace(/-/g, '').slice(0, 32),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'MOCK_SIGN',
      prepayId,
    };
  }

  /** 模拟回调（仅开发/测试） */
  async triggerMockCallback(outTradeNo: string, amountCents: number): Promise<WechatCallbackResult> {
    if (!this.mockMode) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '仅 Mock 模式可用');
    }
    return {
      outTradeNo,
      transactionId: `mock_txn_${outTradeNo}_${Date.now()}`,
      tradeState: 'SUCCESS',
      amountTotal: amountCents,
      success: true,
    };
  }
}
