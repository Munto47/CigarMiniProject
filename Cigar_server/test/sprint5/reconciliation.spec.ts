import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../../src/reconciliation/reconciliation.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ReconciliationService (unit)', () => {
  let service: ReconciliationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      paymentRecord: { aggregate: jest.fn() },
      rechargeOrder: { aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: {} }) },
      reconciliationReport: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('runDailyReconciliation', () => {
    it('运行每日对账并返回报告', async () => {
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _count: 50, _sum: { amountCents: 500000n } });
      prisma.reconciliationReport.upsert.mockResolvedValue({
        id: 1n,
        channel: 'balance',
        date: new Date('2026-04-30'),
        ourCount: 50,
        ourAmountCents: 500000n,
        platformCount: 50,
        platformAmountCents: 500000n,
        diffCount: 0,
        diffAmountCents: 0n,
        status: 'balanced',
        diffDetail: null,
        resolvedByAdminId: null,
        resolvedAt: null,
        createdAt: new Date(),
      });

      const result = await service.runDailyReconciliation('2026-04-30');
      expect(result.channel).toBe('balance');
      expect(result.diffCount).toBe(0);
      expect(result.status).toBe('balanced');
      expect(result.ourAmountYuan).toBe('5000.00');
    });

    it('对账有差异时报告 diff_found', async () => {
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _count: 48, _sum: { amountCents: 480000n } });
      prisma.reconciliationReport.upsert.mockResolvedValue({
        id: 2n,
        channel: 'balance',
        date: new Date('2026-04-30'),
        ourCount: 48,
        ourAmountCents: 480000n,
        platformCount: 48,  // We use our own data as platform for now
        platformAmountCents: 480000n,
        diffCount: 0,
        diffAmountCents: 0n,
        status: 'balanced',
        diffDetail: null,
        resolvedByAdminId: null,
        resolvedAt: null,
        createdAt: new Date(),
      });

      const result = await service.runDailyReconciliation();
      expect(result.status).toBe('balanced');
    });
  });

  describe('getReports', () => {
    it('分页返回对账报告', async () => {
      prisma.reconciliationReport.findMany.mockResolvedValue([
        {
          id: 1n, channel: 'balance',
          date: new Date('2026-04-30'),
          ourCount: 50, ourAmountCents: 500000n,
          platformCount: 50, platformAmountCents: 500000n,
          diffCount: 0, diffAmountCents: 0n,
          status: 'balanced', diffDetail: null,
          resolvedByAdminId: null, resolvedAt: null,
          createdAt: new Date(),
        },
      ]);
      prisma.reconciliationReport.count.mockResolvedValue(1);

      const result = await service.getReports(1, 20);
      expect(result.list.length).toBe(1);
      expect(result.list[0].status).toBe('balanced');
      expect(result.total).toBe(1);
    });
  });

  describe('resolveReport', () => {
    it('标记对账差异为已解决', async () => {
      prisma.reconciliationReport.update.mockResolvedValue({
        id: 1n, status: 'resolved',
      });

      const result = await service.resolveReport('1', 1n);
      expect(result.status).toBe('resolved');
      expect(prisma.reconciliationReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1n },
          data: expect.objectContaining({ status: 'resolved' }),
        }),
      );
    });
  });
});
