import { Test, TestingModule } from '@nestjs/testing';
import { MemberService } from '../../src/member/member.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('MemberService', () => {
  let service: MemberService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      user: { findUnique: jest.fn() },
      memberProfile: { findUnique: jest.fn() },
      levelConfig: { findUnique: jest.fn() },
      balanceTransaction: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getProfile', () => {
    it('应返回完整的会员信息', async () => {
      const mockUser = { id: 1n, nickname: '测试用户', avatarUrl: null, phoneMask: '138****5678' };
      const mockProfile = {
        userId: 1n, balanceCents: 100000n, rechargeLevel: 3, consumptionLevel: 2,
        rechargePoints: 150000n, consumptionPoints: 80000n,
        totalRechargeCents: 500000n, totalSpendCents: 300000n,
        orderCount: 12, loginCount: 50, version: 0,
        createdAt: new Date(), updatedAt: new Date(),
      };
      const mockLevel = { levelType: 'recharge', level: 3, name: '黄金', icon: 'v3' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.memberProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.levelConfig.findUnique as jest.Mock).mockResolvedValue(mockLevel);

      const result = await service.getProfile(1n);

      expect(result).toBeTruthy();
      expect(result!.balanceCents).toBe('100000');
      expect(result!.balanceYuan).toBe('1000.00');
      expect(result!.rechargeLevel).toBe(3);
      expect(result!.rechargeLevelName).toBe('黄金');
      expect(result!.consumptionLevel).toBe(2);
      expect(result!.orderCount).toBe(12);
    });

    it('用户不存在时返回 null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.memberProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getProfile(999n);
      expect(result).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('应返回分页的流水数据', async () => {
      const mockTx = {
        id: 1n, userId: 1n, type: 'recharge', direction: 1,
        amountCents: 100000n, balanceAfterCents: 200000n,
        relatedType: 'recharge_order', relatedId: 1n, relatedNo: 'R20260430000001',
        description: '充值 1000.00 元', operatorAdminId: null, createdAt: new Date(),
      };

      (prisma.balanceTransaction.findMany as jest.Mock).mockResolvedValue([mockTx]);
      (prisma.balanceTransaction.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTransactions(1n, { page: 1, pageSize: 20 });

      expect(result.total).toBe(1);
      expect(result.list[0].type).toBe('recharge');
      expect(result.list[0].amountYuan).toBe('1000.00');
      expect(result.list[0].balanceAfterYuan).toBe('2000.00');
    });

    it('应按类型筛选流水', async () => {
      (prisma.balanceTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.balanceTransaction.count as jest.Mock).mockResolvedValue(0);

      await service.getTransactions(1n, { type: 'consume' });

      expect(prisma.balanceTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1n, type: 'consume' } }),
      );
    });
  });
});
