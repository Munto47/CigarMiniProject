/**
 * 微信支付模块测试
 *
 * 覆盖：
 *   - WechatPayService
 *     1. Mock 模式 createJsapiOrder 返回伪 prepay_id 与签名占位
 *     2. Mock 模式 queryOrder 直接返回 null（不发起 HTTP）
 *     3. Mock 模式 triggerMockCallback 返回 SUCCESS
 *     4. 非 Mock 模式 triggerMockCallback → FORBIDDEN
 *     5. 非 Mock 模式 createJsapiOrder：用真实 RSA 私钥签名 + axios 上游失败 → WECHAT_PAY_API_ERROR
 *     6. 非 Mock 模式 createJsapiOrder：上游成功 → 返回结构化 PayParams 且 paySign 可被对应公钥验签
 *
 *   - WechatCallbackController
 *     1. Mock 模式 + 缺 out_trade_no → FAIL
 *     2. Mock 模式 + 完整字段 → SUCCESS，转交 RechargeService.handlePaymentSuccess
 *     3. 非 Mock 模式 + 缺签名头 → FAIL
 *     4. 非 Mock 模式 + nonce 重放 → SUCCESS (replay) 且 metrics 标记
 *     5. 非 Mock 模式 + 平台证书未配置 → FAIL
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, createVerify } from 'crypto';
import axios from 'axios';

import { WechatPayService } from '../../src/storedvalue/wechat-pay.service';
import { WechatCallbackController } from '../../src/storedvalue/wechat-callback.controller';
import { RechargeService } from '../../src/storedvalue/recharge.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { MetricsService } from '../../src/metrics/metrics.service';
import { BusinessException } from '../../src/common/exceptions/business.exception';
import { ErrorCode } from '../../src/common/constants/error-codes';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

function buildConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key in overrides) return overrides[key];
      return def;
    }),
  } as unknown as ConfigService;
}

const fakeRedis: any = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

describe('WechatPayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Mock 模式：createJsapiOrder 返回伪 prepay_id 与占位签名', async () => {
    const svc = new WechatPayService(buildConfig({ WECHAT_MOCK_MODE: 'true' }), fakeRedis);
    const r = await svc.createJsapiOrder({
      outTradeNo: 'R20260525000001',
      amountCents: 9900,
      description: '充值 99 元',
      openid: 'oABCDEF',
    });
    expect(r.prepayId).toBe('prepay_mock_R20260525000001');
    expect(r.package).toBe('prepay_id=prepay_mock_R20260525000001');
    expect(r.paySign).toBe('MOCK_SIGN');
    expect(r.signType).toBe('RSA');
    expect(r.nonceStr).toHaveLength(32);
  });

  it('Mock 模式：queryOrder 直接返回 null（不发起 HTTP）', async () => {
    const svc = new WechatPayService(buildConfig({ WECHAT_MOCK_MODE: 'true' }), fakeRedis);
    const r = await svc.queryOrder('R20260525000001');
    expect(r).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('Mock 模式：triggerMockCallback 返回 SUCCESS', async () => {
    const svc = new WechatPayService(buildConfig({ WECHAT_MOCK_MODE: 'true' }), fakeRedis);
    const r = await svc.triggerMockCallback('R20260525000001', 9900);
    expect(r.success).toBe(true);
    expect(r.tradeState).toBe('SUCCESS');
    expect(r.amountTotal).toBe(9900);
    expect(r.outTradeNo).toBe('R20260525000001');
  });

  it('非 Mock 模式：triggerMockCallback 应被禁止', async () => {
    const svc = new WechatPayService(buildConfig({ WECHAT_MOCK_MODE: 'false' }), fakeRedis);
    await expect(svc.triggerMockCallback('R001', 100)).rejects.toMatchObject({
      bizCode: ErrorCode.FORBIDDEN,
    });
  });

  describe('非 Mock 模式 createJsapiOrder（真实 RSA 签名）', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const buildSvc = () =>
      new WechatPayService(
        buildConfig({
          WECHAT_MOCK_MODE: 'false',
          WECHAT_APP_ID: 'wx8ce906f76c5c88ce',
          WECHAT_MCH_ID: '1900000001',
          WECHAT_SERIAL_NO: 'SN001',
          WECHAT_MERCHANT_PRIVATE_KEY: pem,
          WECHAT_NOTIFY_URL: 'https://cigar.ruimacode.cn/api/payment/wechat-callback',
        }),
        fakeRedis,
      );

    it('上游 axios 失败 → WECHAT_PAY_API_ERROR (502)', async () => {
      const svc = buildSvc();
      mockedAxios.post.mockRejectedValueOnce(new Error('network down'));
      await expect(
        svc.createJsapiOrder({
          outTradeNo: 'R20260525000002',
          amountCents: 100,
          description: '测试',
          openid: 'oTEST',
        }),
      ).rejects.toMatchObject({ bizCode: ErrorCode.WECHAT_PAY_API_ERROR });
    });

    it('上游成功 → 返回 PayParams 且 paySign 可被公钥验签', async () => {
      const svc = buildSvc();
      mockedAxios.post.mockResolvedValueOnce({ data: { prepay_id: 'wx_prepay_abcdef' } });

      const r = await svc.createJsapiOrder({
        outTradeNo: 'R20260525000003',
        amountCents: 100,
        description: '测试',
        openid: 'oTEST',
      });

      expect(r.prepayId).toBe('wx_prepay_abcdef');
      expect(r.package).toBe('prepay_id=wx_prepay_abcdef');
      expect(r.signType).toBe('RSA');

      // 验证 paySign 是 RSA-SHA256(appId\n + timeStamp\n + nonceStr\n + package\n)
      const signStr = `wx8ce906f76c5c88ce\n${r.timeStamp}\n${r.nonceStr}\n${r.package}\n`;
      const verify = createVerify('RSA-SHA256');
      verify.update(signStr);
      expect(verify.verify(pubPem, r.paySign, 'base64')).toBe(true);

      // 验证 axios 请求带上了 Authorization 头
      const call = mockedAxios.post.mock.calls[0];
      expect(call[0]).toBe('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi');
      expect((call[2] as any).headers.Authorization).toMatch(/^WECHATPAY2-SHA256-RSA2048/);
    });
  });
});

describe('WechatCallbackController', () => {
  let controller: WechatCallbackController;
  let rechargeService: { handlePaymentSuccess: jest.Mock };
  let prisma: any;
  let redis: any;
  let metrics: any;
  let config: ConfigService;

  const buildModule = async (mockMode: boolean, extra: Record<string, string> = {}) => {
    rechargeService = {
      handlePaymentSuccess: jest.fn().mockResolvedValue({
        idempotent: false,
        rechargeNo: 'R20260525000001',
        balanceAfterCents: '10000',
        balanceAfterYuan: '100.00',
      }),
    };
    prisma = { $executeRawUnsafe: jest.fn().mockResolvedValue(undefined) };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    metrics = {
      paymentCallbacksReceivedTotal: { inc: jest.fn() },
      paymentCallbackVerifyFailedTotal: { inc: jest.fn() },
      rechargesCompletedTotal: { inc: jest.fn() },
    };
    config = buildConfig({ WECHAT_MOCK_MODE: mockMode ? 'true' : 'false', ...extra });

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [WechatCallbackController],
      providers: [
        { provide: RechargeService, useValue: rechargeService },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: config },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();
    controller = mod.get(WechatCallbackController);
  };

  it('Mock 模式：缺 out_trade_no → FAIL', async () => {
    await buildModule(true);
    const res: any = await controller.handleCallback({} as any, {}, { amount: { total: 100 } });
    expect(res.code).toBe('FAIL');
    expect(rechargeService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('Mock 模式：完整字段 → 调用 RechargeService 并返回 SUCCESS', async () => {
    await buildModule(true);
    const body = {
      out_trade_no: 'R20260525000001',
      transaction_id: 'wx_txn_xyz',
      amount: { total: 9900 },
      trade_state: 'SUCCESS',
    };

    const res: any = await controller.handleCallback({} as any, {}, body);
    expect(res.code).toBe('SUCCESS');
    expect(rechargeService.handlePaymentSuccess).toHaveBeenCalledWith({
      outTradeNo: 'R20260525000001',
      transactionId: 'wx_txn_xyz',
      amountTotal: 9900,
      tradeState: 'SUCCESS',
      success: true,
    });
    expect(metrics.paymentCallbacksReceivedTotal.inc).toHaveBeenCalledWith({
      channel: 'wechat',
      is_replay: 'false',
    });
  });

  it('非 Mock 模式：缺签名头 → FAIL', async () => {
    await buildModule(false);
    const res: any = await controller.handleCallback({} as any, {}, { id: 'evt_1' });
    expect(res.code).toBe('FAIL');
    expect(res.message).toContain('签名');
    expect(rechargeService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('非 Mock 模式：Wechatpay-Serial 与 PUB_KEY_ID 不一致 → FAIL', async () => {
    await buildModule(false, {
      WECHAT_PAY_PUB_KEY_ID: 'PUB_KEY_ID_EXPECTED',
    });
    const headers = {
      'wechatpay-signature': 'sig',
      'wechatpay-serial': 'PUB_KEY_ID_WRONG',
      'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
      'wechatpay-nonce': 'NONCE_X',
    };
    const res: any = await controller.handleCallback(
      { rawBody: Buffer.from('{}') } as any,
      headers,
      {},
    );
    expect(res.code).toBe('FAIL');
    expect(res.message).toContain('验签密钥不匹配');
    expect(metrics.paymentCallbackVerifyFailedTotal.inc).toHaveBeenCalledWith({ channel: 'wechat' });
  });

  it('非 Mock 模式：时间戳超出 5min 容差 → FAIL', async () => {
    await buildModule(false);
    const headers = {
      'wechatpay-signature': 'sig',
      'wechatpay-serial': 'PUB_KEY_ID_X',
      'wechatpay-timestamp': '1000000000', // 远古时间
      'wechatpay-nonce': 'NONCE_OLD',
    };
    const res: any = await controller.handleCallback(
      { rawBody: Buffer.from('{}') } as any,
      headers,
      {},
    );
    expect(res.code).toBe('FAIL');
    expect(res.message).toContain('时间戳');
  });

  it('非 Mock 模式：nonce 重放 → SUCCESS (replay) 且不再调用业务', async () => {
    await buildModule(false);
    redis.get.mockResolvedValueOnce('1'); // nonce 已存在

    const headers = {
      'wechatpay-signature': 'sig',
      'wechatpay-serial': 'PUB_KEY_ID_X',
      'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
      'wechatpay-nonce': 'NONCE_REPLAY',
    };

    const res: any = await controller.handleCallback(
      { rawBody: Buffer.from('{}') } as any,
      headers,
      {},
    );

    expect(res.code).toBe('SUCCESS');
    expect(res.message).toContain('replay');
    expect(metrics.paymentCallbacksReceivedTotal.inc).toHaveBeenCalledWith({
      channel: 'wechat',
      is_replay: 'true',
    });
    expect(rechargeService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('非 Mock 模式：nonce 写入 Redis TTL=86400（覆盖微信最长重放窗口）', async () => {
    await buildModule(false, { WECHAT_PLATFORM_CERT: '' }); // 后续会因证书未配置 FAIL，但 nonce 已写入
    const headers = {
      'wechatpay-signature': 'sig',
      'wechatpay-serial': 'PUB_KEY_ID_X',
      'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
      'wechatpay-nonce': 'NONCE_FRESH',
    };
    await controller.handleCallback({ rawBody: Buffer.from('{}') } as any, headers, {});
    expect(redis.set).toHaveBeenCalledWith('wxpay:nonce:NONCE_FRESH', '1', 86400);
  });

  it('非 Mock 模式：平台公钥未配置 → FAIL', async () => {
    await buildModule(false, { WECHAT_PLATFORM_CERT: '' });

    const headers = {
      'wechatpay-signature': 'sig',
      'wechatpay-serial': 'PUB_KEY_ID_X',
      'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
      'wechatpay-nonce': 'NONCE_NEW',
    };

    const res: any = await controller.handleCallback(
      { rawBody: Buffer.from('{}') } as any,
      headers,
      { id: 'evt_2' },
    );
    expect(res.code).toBe('FAIL');
    expect(res.message).toContain('平台证书');
  });
});
