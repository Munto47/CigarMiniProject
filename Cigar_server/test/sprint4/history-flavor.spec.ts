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
  let configService: { get: jest.Mock };
  let mockAsrService: { recognizeSentence: jest.Mock };

  beforeEach(async () => {
    prisma = {
      flavorTag: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, name: '木质烟草', category: 'wood', enabled: true, aiWeight: 0.9 },
          { id: 2n, name: '皮革木桶', category: 'leather', enabled: true, aiWeight: 0.7 },
          { id: 3n, name: '奶油丝滑', category: 'sweet', enabled: true, aiWeight: 0.8 },
          { id: 4n, name: '咖啡可可', category: 'roast', enabled: true, aiWeight: 0.85 },
        ]),
      },
      cigarTag: {
        findMany: jest.fn().mockResolvedValue([
          { tag: { id: 1n, name: '木质烟草', category: 'wood', enabled: true, aiWeight: 0.9 } },
        ]),
      },
    };

    mockAsrService = {
      recognizeSentence: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'VOICE_ASR_MOCK') return 'true';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlavorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
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
    expect(result.tags).toHaveLength(4);
    expect(result.categories).toEqual(expect.arrayContaining(['wood', 'leather', 'sweet', 'roast']));
    expect(result.tags[0].name).toBe('木质烟草');
  });

  it('文字模式支持同义词和模糊纠错', async () => {
    const result = await service.analyzeVoice({
      text: '这支雪茄有明显雪松木、奶香和咖啡豆风味，尾段带一点皮格感。',
    });

    expect(result.voiceText).toContain('雪松木');
    expect(result.flavorTags).toEqual(
      expect.arrayContaining(['木质烟草', '奶油丝滑', '咖啡可可', '皮革木桶']),
    );
    expect(result.flavorScores['木质烟草']).toBeGreaterThanOrEqual(60);
    expect(result.flavorScores['皮革木桶']).toBeGreaterThanOrEqual(60);
  });

  it('开发环境数据库不可用时仍可返回本地风味结果', async () => {
    prisma.flavorTag.findMany.mockRejectedValue(new Error('db down'));

    const result = await service.analyzeVoice({
      text: '雪松木、奶香、咖啡豆，还有一点胡椒感。',
    });

    expect(result.flavorTags.length).toBeGreaterThan(0);
    expect(result.flavorTags).toEqual(
      expect.arrayContaining(['木质烟草', '奶油丝滑', '咖啡可可']),
    );
  });

  it('开发环境 ASR 失败时语音分析回退到本地 mock 结果', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'VOICE_ASR_MOCK') return 'false';
      return defaultValue;
    });
    mockAsrService.recognizeSentence.mockRejectedValue(new Error('asr down'));

    const result = await service.analyzeVoice({
      audioBase64: 'invalid-audio',
      audioFormat: 'mp3',
    });

    expect(result.flavorTags.length).toBeGreaterThan(0);
    expect(result.voiceText).toContain('模拟识别到的风味关键词');
  });
});
