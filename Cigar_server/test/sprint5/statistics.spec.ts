import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from '../../src/statistics/statistics.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('StatisticsService (unit)', () => {
  let service: StatisticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      paymentRecord: { aggregate: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      rechargeOrder: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: {} }) },
      refundRecord: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: {} }) },
      cigar: { findMany: jest.fn().mockResolvedValue([]) },
      orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      memberProfile: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
      },
      order: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      balanceTransaction: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: {} }) },
      rechargeTier: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  describe('getSalesStats', () => {
    it('返回按渠道销售统计', async () => {
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 100000n }, _count: 10 }) // balance
        .mockResolvedValueOnce({ _sum: { amountCents: 50000n }, _count: 5 }) // wechat
        .mockResolvedValueOnce({ _sum: { amountCents: 0n }, _count: 0 }); // meituan

      const result = await service.getSalesStats();
      expect(result.byChannel.balance.count).toBe(10);
      expect(result.byChannel.balance.amountYuan).toBe('1000.00');
      expect(result.byChannel.wechat.count).toBe(5);
      expect(result.recharge.totalCount).toBe(0);
      expect(result.refund.totalCount).toBe(0);
    });
  });

  describe('getCategoryStats', () => {
    it('返回分类销售统计', async () => {
      prisma.cigar.findMany.mockResolvedValue([
        { id: 1n, name: '罗密欧', categoryCode: 'robusto' },
        { id: 2n, name: '高希霸', categoryCode: 'churchill' },
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 1n, _sum: { qty: 30, actualAmountCents: 600000n } },
        { productId: 2n, _sum: { qty: 20, actualAmountCents: 500000n } },
      ]);

      const result = await service.getCategoryStats();
      expect(result.length).toBe(2);
      const robusto = result.find((r: any) => r.categoryCode === 'robusto');
      expect(robusto).toBeDefined();
      expect(robusto!.soldQty).toBe(30);
      expect(robusto!.revenueYuan).toBe('6000.00');
    });
  });

  describe('getUserStats', () => {
    it('返回用户统计数据', async () => {
      prisma.user.count.mockResolvedValue(100);
      prisma.order.groupBy.mockResolvedValue([{ userId: 1n }]);
      prisma.memberProfile.count.mockResolvedValue(50);
      prisma.memberProfile.groupBy
        .mockResolvedValueOnce([{ rechargeLevel: 1, _count: 60 }])
        .mockResolvedValueOnce([{ consumptionLevel: 1, _count: 80 }]);

      const result = await service.getUserStats();
      expect(result.totalUsers).toBe(100);
      expect(result.activeUsersLast30Days).toBe(1);
      expect(result.withBalance).toBe(50);
      expect(result.levelDistribution.recharge[0].level).toBe(1);
    });
  });

  describe('getStoredValueStats', () => {
    it('返回储值统计数据', async () => {
      prisma.rechargeOrder.aggregate
        .mockResolvedValueOnce({ _sum: { totalCents: 500000n, amountCents: 450000n, bonusCents: 50000n }, _count: 50 })
        .mockResolvedValueOnce({ _sum: { totalCents: 100000n }, _count: 10 });
      prisma.balanceTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 300000n }, _count: 40 })
        .mockResolvedValueOnce({ _sum: { amountCents: 50000n }, _count: 8 });
      prisma.memberProfile.aggregate.mockResolvedValue({ _sum: { balanceCents: 200000n } });
      prisma.rechargeTier.findMany.mockResolvedValue([]);

      const result = await service.getStoredValueStats();
      expect(result.recharge.totalCount).toBe(50);
      expect(result.recharge.totalBonusYuan).toBe('500.00');
      expect(result.consume.totalCount).toBe(40);
      expect(result.totalBalanceYuan).toBe('2000.00');
    });
  });
});
