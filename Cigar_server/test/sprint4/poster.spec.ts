import { Test, TestingModule } from '@nestjs/testing';
import { PosterService } from '../../src/poster/poster.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('PosterService (unit)', () => {
  let service: PosterService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      posterTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1, logoUrl: null, bgColor: '#0D0D0D', accentColor: '#C9A84C',
          fontStyle: 'serif', clubName: 'GOAT CIGAR CLUB', tagline: '品味非凡',
        }),
        create: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({
          id: 1, clubName: '测试俱乐部', tagline: '新标语',
          bgColor: '#333', accentColor: '#gold', fontStyle: 'sans',
        }),
      },
      poster: {
        create: jest.fn().mockResolvedValue({
          id: 1n, status: 'generated', flavorTags: ['木香', '皮革'],
          flavorScores: { 木香: 80, 皮革: 70 }, createdAt: new Date(),
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 1n, userId: 1n, cigarId: 5n,
          voiceText: '木香和皮革', flavorTags: ['木香', '皮革'],
          flavorScores: { 木香: 80, 皮革: 70 },
          posterImageUrl: null,
          templateSnapshot: { clubName: 'GOAT CIGAR CLUB', bgColor: '#0D0D0D' },
          status: 'generated', createdAt: new Date(),
          cigar: { id: 5n, name: '罗密欧朱丽叶', brand: '罗密欧', heroImageUrl: '/img/5.jpg' },
          user: { nickname: '测试用户', avatarUrl: '/avatar/1.jpg' },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      tastingRecord: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PosterService>(PosterService);
  });

  it('创建海报记录', async () => {
    const result = await service.createPoster(1n, {
      cigarId: 5,
      flavorTags: ['木香', '皮革'],
      flavorScores: { 木香: 80, 皮革: 70 },
    });
    expect(result.id).toBe('1');
    expect(result.status).toBe('generated');
  });

  it('获取海报详情', async () => {
    const result = await service.getPoster(1);
    expect(result.cigarName).toBe('罗密欧朱丽叶');
    expect(result.nickname).toBe('测试用户');
    expect(result.flavorTags).toEqual(['木香', '皮革']);
  });

  it('更新海报模板', async () => {
    const result = await service.updateTemplate({
      clubName: '测试俱乐部',
      tagline: '新标语',
      bgColor: '#333',
      accentColor: '#gold',
      fontStyle: 'sans',
    }, 1n);
    expect(result.clubName).toBe('测试俱乐部');
    expect(result.tagline).toBe('新标语');
  });
});
