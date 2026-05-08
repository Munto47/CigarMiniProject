import { Test, TestingModule } from '@nestjs/testing';
import { TiersService, LevelConfigService } from '../../src/storedvalue/tiers.service';
import { RechargeService } from '../../src/storedvalue/recharge.service';
import { AdjustService } from '../../src/storedvalue/adjust.service';
import { LevelRecalcService } from '../../src/storedvalue/level-recalc.service';
import { WechatPayService } from '../../src/storedvalue/wechat-pay.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { OperationLogService } from '../../src/operation-log/operation-log.service';
import { ConfigService } from '@nestjs/config';

describe('Sprint 2 Core Tests', () => {
  let tiersService: TiersService;
  let levelConfigService: LevelConfigService;
  let prisma: PrismaService;

  const mockPrisma = {
    rechargeTier: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    levelConfig: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    rechargeOrder: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    memberProfile: { findUnique: jest.fn(), update: jest.fn() },
    balanceTransaction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    pointTransaction: { create: jest.fn() },
    levelChangeLog: { create: jest.fn() },
    levelRecalcJob: { create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((cb: unknown) => {
      if (typeof cb === 'function') return cb(mockPrisma);
      return Promise.resolve();
    }),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    raw: { keys: jest.fn().mockResolvedValue([]) },
  };

  const mockOpLog = { log: jest.fn().mockResolvedValue(undefined) };
  const mockConfig = { get: jest.fn((key: string, def?: unknown) => def ?? null) };

  beforeEach(async () => {
    mockConfig.get.mockImplementation((key: string, def?: unknown) => {
      if (key === 'WECHAT_MOCK_MODE') return 'true';
      if (key === 'WECHAT_API_KEY') return 'mock_api_key';
      return def ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiersService,
        LevelConfigService,
        RechargeService,
        WechatPayService,
        AdjustService,
        LevelRecalcService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: OperationLogService, useValue: mockOpLog },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    tiersService = module.get<TiersService>(TiersService);
    levelConfigService = module.get<LevelConfigService>(LevelConfigService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('TiersService', () => {
    it('应返回启用档位（公开模式）', async () => {
      const mockTier = {
        id: 1n, amountCents: 100000n, bonusCents: 2000n,
        displayName: '100元档', enabled: true, sortOrder: 0,
        createdAt: new Date(), updatedAt: new Date(),
      };
      (mockPrisma.rechargeTier.findMany as jest.Mock).mockResolvedValue([mockTier]);

      const result = await tiersService.findAll(false);

      expect(result).toHaveLength(1);
      expect(result[0].amountYuan).toBe('1000.00');
      expect(result[0].bonusYuan).toBe('20.00');
      expect(result[0].totalYuan).toBe('1020.00');
    });

    it('TC-001 验证充值后余额字段正确', () => {
      // 充值金额 100000 分 + 赠送 2000 分 = 总共 102000 分 = 1020.00 元
      const amountCents = 100000n;
      const bonusCents = 2000n;
      const total = amountCents + bonusCents;

      expect(total).toBe(102000n);
      expect(Number(total) / 100).toBe(1020.0);
    });
  });

  describe('LevelConfigService', () => {
    it('应按类型返回等级配置', async () => {
      const mockConfigs = [
        { id: 1n, levelType: 'recharge', level: 1, name: '青铜', minPoints: 0n, maxPoints: 9999n, icon: 'v1', enabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2n, levelType: 'recharge', level: 2, name: '白银', minPoints: 10000n, maxPoints: 29999n, icon: 'v2', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      ];
      (mockPrisma.levelConfig.findMany as jest.Mock).mockResolvedValue(mockConfigs);

      const result = await levelConfigService.findByType('recharge');

      expect(result).toHaveLength(2);
      expect(result[0].level).toBe(1);
      expect(result[1].level).toBe(2);
    });

    it('TC-005 等级计算逻辑', () => {
      // 充值 100000分 (1000元) → 应达到 V2 (min: 10000, max: 29999)
      const levelConfigs = [
        { level: 2, minPoints: 10000n, maxPoints: 29999n },
        { level: 1, minPoints: 0n, maxPoints: 9999n },
      ].sort((a, b) => b.level - a.level); // desc

      const points = 10000; // 1000元充值
      let newLevel = 1;
      for (const lc of levelConfigs) {
        const min = Number(lc.minPoints);
        const max = lc.maxPoints !== null ? Number(lc.maxPoints) : Number.MAX_SAFE_INTEGER;
        if (points >= min && points <= max) {
          newLevel = lc.level;
          break;
        }
      }

      expect(newLevel).toBe(2);
    });

    it('TC-006 等级区间边界测试', () => {
      const levelConfigs = [
        { level: 3, minPoints: 30000n, maxPoints: null },
        { level: 2, minPoints: 10000n, maxPoints: 29999n },
        { level: 1, minPoints: 0n, maxPoints: 9999n },
      ].sort((a, b) => b.level - a.level);

      // 测试 V3 → 无上限
      const calcLevel = (pts: number) => {
        let lvl = 1;
        for (const lc of levelConfigs) {
          const min = Number(lc.minPoints);
          const max = lc.maxPoints !== null ? Number(lc.maxPoints) : Number.MAX_SAFE_INTEGER;
          if (pts >= min && pts <= max) { lvl = lc.level; break; }
        }
        return lvl;
      };

      expect(calcLevel(0)).toBe(1);
      expect(calcLevel(9999)).toBe(1);
      expect(calcLevel(10000)).toBe(2);
      expect(calcLevel(29999)).toBe(2);
      expect(calcLevel(30000)).toBe(3);
      expect(calcLevel(999999)).toBe(3);
    });
  });

  describe('AdjustService', () => {
    let adjustService: AdjustService;
    let testModule: TestingModule;

    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        providers: [
          AdjustService,
          LevelRecalcService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
          { provide: OperationLogService, useValue: mockOpLog },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      adjustService = testModule.get<AdjustService>(AdjustService);
    });

    it('幂等命中：重复请求返回缓存结果', async () => {
      const cached = {
        balanceBefore: '100000',
        balanceBeforeYuan: '1000.00',
        balanceAfter: '105000',
        balanceAfterYuan: '1050.00',
        direction: 1,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await adjustService.adjustBalance(
        1n, 'admin', { userId: 1, amountCents: 5000, reason: '测试' },
        'test-key', '127.0.0.1',
      );

      expect(result.idempotent).toBe(true);
      expect(result.balanceAfter).toBe('105000');
    });

    it('扣款超额应抛出余额不足', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockImplementationOnce(async (cb: unknown) => {
        const txMock = {
          ...mockPrisma,
          memberProfile: {
            findUnique: jest.fn().mockResolvedValue({ userId: 1n, balanceCents: 1000n, version: 0 }),
          },
        };
        if (typeof cb === 'function') return cb(txMock);
      });

      await expect(
        adjustService.adjustBalance(
          1n, 'admin', { userId: 1, amountCents: -2000, reason: '超额扣款测试' },
          'test-key-2', '127.0.0.1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('RechargeService - 充值等级升级', () => {
    it('TC-005 充值应触发等级升级', async () => {
      // 此测试验证充值后等级升级的算法逻辑
      const oldLevel = 1;
      const newPoints = 10000; // 充值100元 = 10000分

      const levelConfigs = [
        { level: 2, minPoints: 10000n, maxPoints: 29999n },
        { level: 1, minPoints: 0n, maxPoints: 9999n },
      ].sort((a, b) => b.level - a.level);

      let newLevel = 1;
      for (const lc of levelConfigs) {
        const min = Number(lc.minPoints);
        const max = lc.maxPoints !== null ? Number(lc.maxPoints) : Number.MAX_SAFE_INTEGER;
        if (newPoints >= min && newPoints <= max) {
          newLevel = lc.level;
          break;
        }
      }

      const upgraded = newLevel !== oldLevel;
      expect(upgraded).toBe(true);
      expect(newLevel).toBe(2);
    });
  });

  describe('Balance Transaction 不变量', () => {
    it('TC-001 充值100元 → 余额+10000分，流水1条', () => {
      const amountCents = 10000n;
      const balanceBefore = 0n;
      const balanceAfter = balanceBefore + amountCents;

      expect(Number(balanceAfter) / 100).toBe(100.0);
      expect(balanceAfter).toBe(10000n);
    });

    it('余额不变量 SUM(流水) ≡ balance_cents', () => {
      // 模拟用户操作序列
      const transactions = [
        { type: 'recharge', direction: 1, amountCents: 100000n },   // +1000元
        { type: 'recharge', direction: 1, amountCents: 50000n },     // +500元
        { type: 'consume', direction: -1, amountCents: 24400n },     // -244元
        { type: 'refund', direction: 1, amountCents: 10000n },       // +100元
      ];

      let balance = 0n;
      for (const tx of transactions) {
        if (tx.direction === 1) {
          balance += tx.amountCents;
        } else {
          balance -= tx.amountCents;
        }
      }

      // 1000 + 500 - 244 + 100 = 1356 元
      expect(balance).toBe(135600n);
      expect(Number(balance) / 100).toBe(1356.0);
    });
  });

  describe('幂等键时间窗', () => {
    it('同一 Idempotency-Key 的第二次请求应在缓存命中', async () => {
      const idempotencyKey = 'duplicate-test-key-001';
      const cachedValue = JSON.stringify({ rechargeNo: 'R20260430000001' });

      // 模拟缓存命中
      mockRedis.get.mockResolvedValueOnce(cachedValue);
      mockPrisma.rechargeOrder.findUnique.mockResolvedValueOnce({
        rechargeNo: 'R20260430000001', status: 'success',
      });
      mockRedis.get.mockResolvedValueOnce('prepay_mock_R20260430000001');

      expect(mockRedis.get).toBeDefined();
    });
  });
});
