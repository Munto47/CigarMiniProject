import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from '../../src/history/history.service';
import { FlavorService } from '../../src/flavor/flavor.service';
import { AsrService } from '../../src/asr/asr.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('HistoryService (unit)', () => {
  let service: HistoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tastingRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1n, userId: 1n, cigarId: 5n,
            flavorTags: ['木香', '皮革'], flavorScores: { 木香: 80, 皮革: 70 },
            source: 'manual', createdAt: new Date(),
            cigar: { id: 5n, name: '罗密欧朱丽叶', brand: '罗密欧', thumbUrl: '/t/5.jpg' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({
          id: 2n, createdAt: new Date(),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  it('获取品鉴历史', async () => {
    const result = await service.getHistory(1n, 1, 20);
    expect(result.list).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.list[0].cigarName).toBe('罗密欧朱丽叶');
    expect(result.list[0].source).toBe('manual');
  });

  it('记录新品鉴', async () => {
    const result = await service.createTasting(1n, 5, ['木香'], { 木香: 85 }, 'voice');
    expect(result.id).toBe('2');
  });
});

describe('FlavorService (unit)', () => {
  let service: FlavorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      flavorTag: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, name: '木香', category: 'wood', enabled: true },
          { id: 2n, name: '皮革', category: 'leather', enabled: true },
          { id: 3n, name: '甜感', category: 'sweet', enabled: true },
        ]),
      },
      cigarTag: {
        findMany: jest.fn().mockResolvedValue([
          { tag: { id: 1n, name: '木香', category: 'wood', enabled: true } },
        ]),
      },
    };

    const mockAsrService = {
      recognizeSentence: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlavorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('true') } },
        { provide: AsrService, useValue: mockAsrService },
      ],
    }).compile();

    service = module.get<FlavorService>(FlavorService);
  });

  it('Mock 模式语音分析返回风味标签和评分', async () => {
    const result = await service.analyzeVoice({ audioBase64: 'mock_audio', cigarId: 5 });
    expect(result.flavorTags).toBeDefined();
    expect(result.flavorTags.length).toBeGreaterThan(0);
    expect(result.flavorScores).toBeDefined();
    expect((result as any).note).toContain('Mock');
  });

  it('获取风味标签列表', async () => {
    const result = await service.getFlavorTags();
    expect(result.tags).toHaveLength(3);
    expect(result.categories).toEqual(['wood', 'leather', 'sweet']);
    expect(result.tags[0].name).toBe('木香');
  });
});
