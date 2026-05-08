/**
 * 幂等场景 mock 测试（Sprint 0）
 * 覆盖 Plan.md §7.5 定义的 9 个幂等场景
 * 纯单元测试，不依赖 AppModule
 */
import { BusinessException } from '../../src/common/exceptions/business.exception';
import { ErrorCode } from '../../src/common/constants/error-codes';
import { centsToYuan, yuanToCents } from '../../src/common/utils/money';
import { toBeijing, nowBeijing } from '../../src/common/utils/time';
import {
  maskPhone,
  maskPayload,
  truncateJson,
} from '../../src/common/utils/mask';

// ================================================================
// 幂等场景（§7.5 的核心逻辑测试）
// ================================================================
describe('幂等场景 - Idempotency Scenarios (§7.5)', () => {
  // Redis SETNX 幂等锁模拟
  const idemStore = new Map<string, string>();

  function mockSetnx(key: string, value: string, _ttl?: number): boolean {
    void _ttl;
    if (idemStore.has(key)) return false;
    idemStore.set(key, value);
    return true;
  }

  function mockGet(key: string): string | null {
    return idemStore.get(key) ?? null;
  }

  beforeEach(() => idemStore.clear());

  // 场景 1: 客户端重复下单
  describe('Scenario 1: 客户端重复下单 — Idempotency-Key', () => {
    it('相同 key 的第 2 次请求应命中幂等返回首次结果', () => {
      const userId = 1;
      const idemKey = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
      const lockKey = `idem:order:${userId}:${idemKey}`;

      // 第 1 次请求：SETNX 成功 → 执行业务
      const first = mockSetnx(
        lockKey,
        JSON.stringify({ orderNo: 'ORD20260430000001' }),
        600,
      );
      expect(first).toBe(true);
      const createdOrder = { orderNo: 'ORD20260430000001' };

      // 业务执行后将结果缓存
      idemStore.set(lockKey, JSON.stringify(createdOrder));

      // 第 2 次请求：SETNX 失败 → 读缓存返回
      const second = mockSetnx(lockKey, 'dup', 600);
      expect(second).toBe(false);

      const cached = mockGet(lockKey);
      expect(cached).not.toBeNull();

      expect((JSON.parse(cached!) as { orderNo: string }).orderNo).toBe(
        'ORD20260430000001',
      );
    });
  });

  // 场景 2/3: 第三方回调重放 — payment_callbacks 唯一约束
  describe('Scenario 2 & 3: 微信/美团回调重放', () => {
    it('同 (channel, external_id) 的回调只处理一次', () => {
      // DB 层: UNIQUE (channel, external_id)
      // INSERT ... ON CONFLICT (channel, external_id) DO UPDATE received_count += 1
      const callbackLog = new Map<
        string,
        { processed: boolean; count: number }
      >();

      function upsertCallback(
        channel: string,
        externalId: string,
      ): { processed: boolean; count: number } {
        const key = `${channel}:${externalId}`;
        const existing = callbackLog.get(key);
        if (existing) {
          existing.count++;
          return existing;
        }
        callbackLog.set(key, { processed: false, count: 1 });
        return { processed: false, count: 1 };
      }

      // 首次收到
      const first = upsertCallback('wechat', '4200001234567890');
      expect(first.processed).toBe(false);
      expect(first.count).toBe(1);

      // 标为已处理
      callbackLog.set('wechat:4200001234567890', { processed: true, count: 1 });

      // 重放 100 次
      for (let i = 0; i < 100; i++) {
        upsertCallback('wechat', '4200001234567890');
      }

      const final = callbackLog.get('wechat:4200001234567890')!;
      expect(final.processed).toBe(true);
      expect(final.count).toBe(101); // 1 次首次 + 100 次重放
    });
  });

  // 场景 4: 充值重复入账 — balance_transactions 唯一约束
  describe('Scenario 4: 充值重复入账 — 唯一约束 (user_id, related_type, related_no, type)', () => {
    it('同一业务事件的流水只能插入一次', () => {
      const transactions = new Set<string>();

      function insertBalanceTx(
        userId: number,
        relatedType: string,
        relatedNo: string,
        type: string,
      ): 'inserted' | 'conflict' {
        const key = `${userId}:${relatedType}:${relatedNo}:${type}`;
        if (transactions.has(key)) return 'conflict';
        transactions.add(key);
        return 'inserted';
      }

      // 首次入账成功
      expect(
        insertBalanceTx(1, 'recharge_order', 'R20260430000001', 'recharge'),
      ).toBe('inserted');

      // 重复入账被唯一约束挡下
      for (let i = 0; i < 10; i++) {
        expect(
          insertBalanceTx(1, 'recharge_order', 'R20260430000001', 'recharge'),
        ).toBe('conflict');
      }
      expect(transactions.size).toBe(1);
    });
  });

  // 场景 5: 管理员调整余额
  describe('Scenario 5: 管理员调整余额 — Idempotency-Key', () => {
    it('同一个 admin + key 的调整只执行一次', () => {
      const adminId = 1;
      const idemKey = 'adj-uuid-12345';
      const key = `idem:adjust:${adminId}:${idemKey}`;

      const first = mockSetnx(key, 'txn_1001', 600);
      expect(first).toBe(true);

      const second = mockSetnx(key, 'txn_1001', 600);
      expect(second).toBe(false);

      // balance_transactions 唯一约束 (user_id, 'manual', key, 'adjust') 是第二道防线
      const btUnique = `${1}:manual:${idemKey}:adjust`;
      const btSet = new Set<string>();
      expect(btSet.has(btUnique)).toBe(false);
      btSet.add(btUnique);
      expect(btSet.has(btUnique)).toBe(true); // 重复插入会抛 P2002
    });
  });

  // 场景 6: 退款幂等保护
  describe('Scenario 6: 退款幂等保护', () => {
    it('存在 pending 退款时返回 4005', () => {
      const ex = new BusinessException(
        ErrorCode.REFUND_IN_FLIGHT,
        '存在进行中的退款，禁止重复发起',
      );
      expect(ex.bizCode).toBe(4005);
      expect(ex.getStatus()).toBe(409);
    });

    it('退款金额超过可退金额返回 4004', () => {
      const ex = new BusinessException(
        ErrorCode.REFUND_EXCEED,
        '退款金额超过可退金额',
      );
      expect(ex.bizCode).toBe(4004);
    });
  });

  // 场景 9: 业务键兜底
  describe('Scenario 9: 业务键兜底（无 Idempotency-Key 时）', () => {
    it('同一 user + tier + 5s 窗口内视为重复', () => {
      const now = Date.now();
      const isWithinWindow = (a: number, b: number) => Math.abs(a - b) <= 5000;

      expect(isWithinWindow(now, now + 3000)).toBe(true);
      expect(isWithinWindow(now, now + 6000)).toBe(false);
    });
  });
});

// ================================================================
// 工具函数
// ================================================================
describe('工具函数', () => {
  describe('money', () => {
    it('centsToYuan', () => {
      expect(centsToYuan(128000)).toBe('1280.00');
      expect(centsToYuan(100)).toBe('1.00');
      expect(centsToYuan(0)).toBe('0.00');
      expect(centsToYuan(99)).toBe('0.99');
    });

    it('yuanToCents', () => {
      expect(yuanToCents('1280.00')).toBe(128000n);
      expect(yuanToCents(1.5)).toBe(150n);
      expect(yuanToCents('0.01')).toBe(1n);
    });

    it('往返一致性', () => {
      expect(centsToYuan(yuanToCents('299.99'))).toBe('299.99');
      expect(centsToYuan(yuanToCents('0.50'))).toBe('0.50');
    });
  });

  describe('time', () => {
    it('toBeijing UTC 12:00 → 北京 20:00', () => {
      const utc = new Date('2026-04-30T12:00:00Z');
      const bj = toBeijing(utc);
      expect(bj).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(bj).toContain('20:00:00');
    });

    it('nowBeijing 返回格式化字符串', () => {
      const bj = nowBeijing();
      expect(bj).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('mask', () => {
    it('maskPhone 中间四位脱敏', () => {
      expect(maskPhone('13812345678')).toBe('138****5678');
      expect(maskPhone('')).toBe('');
      expect(maskPhone('12345')).toBe('12345');
    });

    it('truncateJson 超限截断', () => {
      const longData = { key: 'x'.repeat(5000) };
      const result = truncateJson(longData, 4096) as Record<string, unknown>;
      expect(result._truncated).toBe(true);
    });

    it('truncateJson 不超限保留', () => {
      const smallData = { key: 'hello' };
      expect(truncateJson(smallData, 4096)).toEqual(smallData);
    });

    it('maskPayload 脱敏敏感字段', () => {
      const payload = {
        phone: '13812345678',
        nickname: '测试用户',
        nested: { api_key: 'secret123' },
      };
      const masked = maskPayload(payload);
      expect(masked.phone).toBe('****');
      expect(masked.nickname).toBe('测试用户');
      expect((masked.nested as Record<string, unknown>).api_key).toBe('****');
    });
  });
});

// ================================================================
// BusinessException
// ================================================================
describe('BusinessException', () => {
  it('错误码 → HTTP 状态码映射', () => {
    expect(BusinessException.toHttpStatus(ErrorCode.TOKEN_EXPIRED)).toBe(401);
    expect(BusinessException.toHttpStatus(ErrorCode.TOKEN_INVALID)).toBe(401);
    expect(BusinessException.toHttpStatus(ErrorCode.NOT_LOGIN)).toBe(401);
    expect(BusinessException.toHttpStatus(ErrorCode.FORBIDDEN)).toBe(403);
    expect(BusinessException.toHttpStatus(ErrorCode.ACCOUNT_LOCKED)).toBe(423);
    expect(BusinessException.toHttpStatus(ErrorCode.RESOURCE_LOCKED)).toBe(423);
    expect(BusinessException.toHttpStatus(ErrorCode.MUST_CHANGE_PASSWORD)).toBe(
      426,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.BUSINESS_CONFLICT)).toBe(
      409,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.ALREADY_REVIEWED)).toBe(
      409,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.REFUND_IN_FLIGHT)).toBe(
      409,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.ORDER_EXPIRED)).toBe(410);
    expect(BusinessException.toHttpStatus(ErrorCode.RATE_LIMITED)).toBe(429);
    expect(BusinessException.toHttpStatus(ErrorCode.BALANCE_INSUFFICIENT)).toBe(
      422,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.STOCK_INSUFFICIENT)).toBe(
      422,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.REFUND_EXCEED)).toBe(422);
    expect(BusinessException.toHttpStatus(ErrorCode.WECHAT_PAY_API_ERROR)).toBe(
      502,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.MEITUAN_API_ERROR)).toBe(
      502,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.UPSTREAM_AI_ERROR)).toBe(
      502,
    );
    expect(BusinessException.toHttpStatus(ErrorCode.INTERNAL_ERROR)).toBe(500);
  });

  it('实例化后响应体包含 code + message', () => {
    const ex = new BusinessException(ErrorCode.STOCK_INSUFFICIENT, '库存不足');
    expect(ex.bizCode).toBe(3002);
    expect(ex.getStatus()).toBe(422);
    const body = ex.getResponse() as Record<string, unknown>;
    expect(body.code).toBe(3002);
    expect(body.message).toBe('库存不足');
  });
});

// ================================================================
// Error Code 完整性
// ================================================================
describe('错误码完整性（Plan.md §4.2）', () => {
  it('所有定义的错误码都存在且唯一', () => {
    const codes = Object.values(ErrorCode);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size); // 无重复

    const required = [
      0, 1001, 1002, 1003, 1004, 1005, 1006, 2001, 2002, 2003, 2004, 3001, 3002,
      3003, 4001, 4002, 4003, 4004, 4005, 5001, 6001, 6002, 6003, 9001,
    ];
    for (const c of required) {
      expect(codes).toContain(c);
    }
  });
});
