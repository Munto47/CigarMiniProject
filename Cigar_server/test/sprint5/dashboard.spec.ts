import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('DashboardService (unit)', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn() },
      order: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentRecord: {
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      cigar: { count: jest.fn() },
      memberProfile: { aggregate: jest.fn() },
      orderItem: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getOverview', () => {
    it('返回概览数据', async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5) // todayNew
        .mockResolvedValueOnce(30); // monthNew
      prisma.order.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(3) // today
        .mockResolvedValueOnce(50) // month
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(180) // completed
        .mockResolvedValueOnce(10) // cancelled
        .mockResolvedValueOnce(5); // refunded
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 500000n } }) // total
        .mockResolvedValueOnce({ _sum: { amountCents: 15000n } }) // today
        .mockResolvedValueOnce({ _sum: { amountCents: 100000n } }); // month
      prisma.cigar.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45); // active
      prisma.memberProfile.aggregate.mockResolvedValue({ _sum: { balanceCents: 3000000n } });

      const result = await service.getOverview();

      expect(result.users.total).toBe(100);
      expect(result.users.todayNew).toBe(5);
      expect(result.users.monthNew).toBe(30);
      expect(result.orders.total).toBe(200);
      expect(result.orders.pending).toBe(5);
      expect(result.revenue.totalYuan).toBe('5000.00');
      expect(result.revenue.todayYuan).toBe('150.00');
      expect(result.products.total).toBe(50);
      expect(result.balance.totalYuan).toBe('30000.00');
    });
  });

  describe('getSalesTrend', () => {
    it('返回按日销售趋势', async () => {
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      prisma.paymentRecord.findMany.mockResolvedValue([
        { amountCents: 10000n, createdAt: today },
        { amountCents: 20000n, createdAt: today },
      ]);

      const result = await service.getSalesTrend(7);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      const todayEntry = result.find((r: any) => r.date === todayKey);
      expect(todayEntry).toBeDefined();
      expect(todayEntry!.revenueYuan).toBe('300.00');
      expect(todayEntry!.orders).toBe(2);
    });
  });

  describe('getRecentOrders', () => {
    it('返回最近订单列表', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 1n, orderNo: 'ORD001', userNameSnapshot: '张三',
          status: 'paid', actualPayCents: 50000n, payMethod: 'balance',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getRecentOrders(5);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].orderNo).toBe('ORD001');
      expect(result[0].actualPayYuan).toBe('500.00');
    });
  });

  describe('getTopProducts', () => {
    it('返回畅销商品排行', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        {
          productId: 1n, nameSnapshot: '罗密欧朱丽叶',
          productType: 'cigar',
          _sum: { qty: 50, actualAmountCents: 1000000n },
        },
      ]);

      const result = await service.getTopProducts(5);
      expect(result[0].name).toBe('罗密欧朱丽叶');
      expect(result[0].soldQty).toBe(50);
      expect(result[0].revenueYuan).toBe('10000.00');
    });
  });
});
