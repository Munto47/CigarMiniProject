import { Test, TestingModule } from '@nestjs/testing';
import { RecommendService } from '../../src/recommend/recommend.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('RecommendService (unit)', () => {
  let service: RecommendService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      recommendQuestion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1n, position: 1, title: '偏好强度?', multi: false,
            options: [
              { label: '浓郁', flavorWeights: { strong: 3, woody: 1 } },
              { label: '清淡', flavorWeights: { light: 3, fruity: 1 } },
            ],
          },
          {
            id: 2n, position: 2, title: '偏好的口感?', multi: false,
            options: [
              { label: '顺滑', flavorWeights: { smooth: 2, sweet: 1 } },
              { label: '辛辣', flavorWeights: { spicy: 3 } },
            ],
          },
        ]),
      },
      cigar: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1n, name: '罗密欧朱丽叶 1875', brand: '罗密欧', spec: '单支',
            strength: '中等', flavorStart: '木香', flavorMid: '皮革', flavorEnd: '甜感',
            scenes: ['商务', '独处'], priceCents: 128000n, memberPriceCents: 115200n,
            thumbUrl: '/thumb/1.jpg', ratingAvg: 4.5, ratingCount: 20, status: 'active', deletedAt: null,
            cigarTags: [
              { tag: { id: 1n, name: '木香', category: 'wood', enabled: true, scoreMap: { strong: 5, woody: 10, smooth: 3 } } },
              { tag: { id: 2n, name: '皮革', category: 'leather', enabled: true, scoreMap: { strong: 8, spicy: 2 } } },
            ],
            reviews: [{ rating: 4 }, { rating: 5 }],
          },
          {
            id: 2n, name: 'Cohiba 世纪六', brand: 'Cohiba', spec: '单支',
            strength: '浓郁', flavorStart: '皮革', flavorMid: '木香', flavorEnd: '辛辣',
            scenes: ['独处', '餐后'], priceCents: 380000n, memberPriceCents: 342000n,
            thumbUrl: '/thumb/2.jpg', ratingAvg: 4.8, ratingCount: 35, status: 'active', deletedAt: null,
            cigarTags: [
              { tag: { id: 3n, name: '辛辣', category: 'spicy', enabled: true, scoreMap: { strong: 9, spicy: 10 } } },
            ],
            reviews: [{ rating: 5 }, { rating: 5 }],
          },
        ]),
      },
      recommendLog: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecommendService>(RecommendService);
  });

  it('规则引擎根据用户偏好推荐雪茄', async () => {
    const result = await service.recommend([
      { questionId: 1, optionIndex: 0 },  // 浓郁 → strong:3, woody:1
      { questionId: 2, optionIndex: 1 },  // 辛辣 → spicy:3
    ], 10, 1n);

    expect(result.list.length).toBeGreaterThan(0);
    // Cohiba scores higher: strong:9*3+spicy:10*3=57 > 罗密欧: strong:5*3+woody:10*1+smooth:0+strong:8*3=49
    expect(result.list[0].name).toContain('Cohiba');
  });

  it('无匹配偏好时返回热门雪茄（fallback）', async () => {
    const result = await service.recommend([
      { questionId: 999, optionIndex: 0 },  // 不存在的问题
    ], 5, 1n);

    expect(result.fallback).toBe(true);
    expect(result.list.length).toBeGreaterThan(0);
  });

  it('getQuestions 返回题目列表', async () => {
    const result = await service.getQuestions();
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].title).toBe('偏好强度?');
  });
});
