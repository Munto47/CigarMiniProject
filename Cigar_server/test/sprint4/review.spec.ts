import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../../src/review/review.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ReviewService (unit)', () => {
  let service: ReviewService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      sensitiveWord: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 1n, status: 'completed' }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({ productId: 5n, productType: 'cigar' }),
      },
      review: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 1n, ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 2 } }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
      memberProfile: {
        findUnique: jest.fn().mockResolvedValue({ rechargeLevel: 2, consumptionLevel: 3 }),
      },
      cigar: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  describe('createReview', () => {
    it('提交评价成功（无敏感词→visible）', async () => {
      const result = await service.createReview(1n, 5, 1, 5, '非常好');
      expect(result.status).toBe('visible');
      expect(result.hint).toBeNull();
    });

    it('含敏感词时状态为 pending', async () => {
      prisma.sensitiveWord.findMany.mockResolvedValueOnce([{ word: '违禁词' }, { word: '垃圾' }]);
      const result = await service.createReview(1n, 5, 1, 5, '这是违禁词内容');
      expect(result.status).toBe('pending');
      expect(result.hint).toBeTruthy();
    });

    it('订单不属于当前用户时抛出异常', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.createReview(1n, 5, 999, 5, 'test'),
      ).rejects.toThrow('订单不属于你');
    });

    it('重复评价抛出异常', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 1n });
      await expect(
        service.createReview(1n, 5, 1, 5, 'test'),
      ).rejects.toThrow('已评价过');
    });
  });

  describe('getCigarReviews', () => {
    it('返回分页数据', async () => {
      prisma.review.findMany.mockResolvedValue([
        { id: 1n, userId: 1n, rating: 4, content: '好', rechargeLevelSnap: 2, consumptionLevelSnap: 3, createdAt: new Date(), user: { nickname: '测试', avatarUrl: null } },
      ]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getCigarReviews(5, 1, 20);
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.list[0].nickname).toBe('测试');
    });
  });

  describe('sensitiveWords CRUD', () => {
    it('创建敏感词', async () => {
      prisma.sensitiveWord.create.mockResolvedValue({ id: 1n, word: '测试词' });
      const result = await service.createSensitiveWord('测试词', 1n);
      expect(result.word).toBe('测试词');
    });

    it('重复敏感词抛出异常', async () => {
      prisma.sensitiveWord.findUnique.mockResolvedValue({ id: 1n, word: '重复词' });
      await expect(
        service.createSensitiveWord('重复词', 1n),
      ).rejects.toThrow('已存在');
    });
  });
});
