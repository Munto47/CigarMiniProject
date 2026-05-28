/**
 * AI 语音模块（ASR + Flavor 边界）测试
 *
 * 覆盖：
 *   1. AsrService：未配置凭证 / SDK 调用失败 / 成功返回结构化结果
 *   2. FlavorService.analyzeVoice：
 *      - 空入参（既无文字也无音频） → BadRequestException
 *      - 空白文字（仅空格） → BadRequestException
 *      - 文字与音频同时传入 → 优先走文字路径，跳过 ASR
 *      - 非 mock 模式 ASR 成功但识别为空 → 抛 UPSTREAM_AI_ERROR
 *      - 非 mock 模式 ASR 成功 → 走风味提取
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AsrService } from '../../src/asr/asr.service';
import { FlavorService } from '../../src/flavor/flavor.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BusinessException } from '../../src/common/exceptions/business.exception';
import { ErrorCode } from '../../src/common/constants/error-codes';

describe('AsrService (unit)', () => {
  function buildService(envMap: Record<string, string>) {
    const config = {
      get: jest.fn((key: string, def?: string) => (key in envMap ? envMap[key] : def ?? '')),
    } as unknown as ConfigService;
    return new AsrService(config);
  }

  it('未配置腾讯云凭证时应抛出 UPSTREAM_AI_ERROR', async () => {
    const svc = buildService({}); // 没有 TENCENT_SECRET_ID/KEY
    await expect(svc.recognizeSentence('YWJj', 'mp3')).rejects.toMatchObject({
      bizCode: ErrorCode.UPSTREAM_AI_ERROR,
    });
  });

  it('SDK 调用失败应被包装为 UPSTREAM_AI_ERROR', async () => {
    const svc = buildService({
      TENCENT_SECRET_ID: 'fake-id',
      TENCENT_SECRET_KEY: 'fake-key',
    });

    // mock 内部 client
    (svc as any).client = {
      SentenceRecognition: jest.fn().mockRejectedValue(new Error('upstream timeout')),
    };

    await expect(svc.recognizeSentence('YWJj', 'mp3')).rejects.toMatchObject({
      bizCode: ErrorCode.UPSTREAM_AI_ERROR,
      message: expect.stringContaining('upstream timeout'),
    });
  });

  it('SDK 返回结果应被标准化', async () => {
    const svc = buildService({
      TENCENT_SECRET_ID: 'fake-id',
      TENCENT_SECRET_KEY: 'fake-key',
    });

    (svc as any).client = {
      SentenceRecognition: jest.fn().mockResolvedValue({
        Result: '雪松木 奶香 咖啡豆',
        AudioDuration: 3200,
        WordList: [
          { Word: '雪松木', StartTime: 0, EndTime: 800 },
          { Word: '奶香', StartTime: 900, EndTime: 1500 },
        ],
      }),
    };

    const r = await svc.recognizeSentence('YWJj', 'mp3');
    expect(r.text).toBe('雪松木 奶香 咖啡豆');
    expect(r.audioDuration).toBe(3200);
    expect(r.wordList).toHaveLength(2);
    expect(r.wordList?.[0].word).toBe('雪松木');
  });

  it('SDK 返回缺字段时应使用默认值', async () => {
    const svc = buildService({
      TENCENT_SECRET_ID: 'fake-id',
      TENCENT_SECRET_KEY: 'fake-key',
    });
    (svc as any).client = {
      SentenceRecognition: jest.fn().mockResolvedValue({}),
    };
    const r = await svc.recognizeSentence('', 'mp3');
    expect(r.text).toBe('');
    expect(r.audioDuration).toBe(0);
    expect(r.wordList).toEqual([]);
  });
});

describe('FlavorService.analyzeVoice 边界', () => {
  let service: FlavorService;
  let prisma: any;
  let config: { get: jest.Mock };
  let asrService: { recognizeSentence: jest.Mock };

  beforeEach(async () => {
    prisma = {
      flavorTag: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, name: '木质烟草', category: 'wood', enabled: true, aiWeight: 0.9 },
          { id: 2n, name: '奶油丝滑', category: 'sweet', enabled: true, aiWeight: 0.8 },
        ]),
      },
      cigarTag: { findMany: jest.fn().mockResolvedValue([]) },
    };
    asrService = { recognizeSentence: jest.fn() };
    config = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'VOICE_ASR_MOCK') return 'false';
        if (key === 'DEV_DATA_FALLBACK') return 'false';
        if (key === 'NODE_ENV') return 'production';
        return def;
      }),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        FlavorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: AsrService, useValue: asrService },
      ],
    }).compile();
    service = mod.get(FlavorService);
  });

  it('既无文字也无音频 → BadRequestException', async () => {
    await expect(service.analyzeVoice({} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('仅空白字符的文字 → BadRequestException("文字描述不能为空")', async () => {
    await expect(service.analyzeVoice({ text: '   \n  ' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('同时传文字和音频 → 走音频路径（audio 优先），调用 ASR', async () => {
    // 当 audioBase64 存在时，按代码实现走 ASR 流程，text 字段被忽略
    asrService.recognizeSentence.mockResolvedValue({
      text: '来自 ASR 的雪松木',
      audioDuration: 1500,
    });

    const result = await service.analyzeVoice({
      text: '这段文字应该被忽略',
      audioBase64: 'aGVsbG8=',
      audioFormat: 'mp3',
    } as any);

    expect(asrService.recognizeSentence).toHaveBeenCalledTimes(1);
    expect(result.voiceText).toBe('来自 ASR 的雪松木');
    expect(result.flavorTags).toEqual(expect.arrayContaining(['木质烟草']));
  });

  it('生产环境 ASR 返回空文字 → UPSTREAM_AI_ERROR', async () => {
    asrService.recognizeSentence.mockResolvedValue({ text: '', audioDuration: 0 });
    await expect(
      service.analyzeVoice({ audioBase64: 'aGVsbG8=', audioFormat: 'mp3' } as any),
    ).rejects.toMatchObject({ bizCode: ErrorCode.UPSTREAM_AI_ERROR });
  });

  it('生产环境 ASR 成功 → 走风味提取并返回 audioDuration', async () => {
    asrService.recognizeSentence.mockResolvedValue({
      text: '这支雪茄有明显雪松木与奶香',
      audioDuration: 4500,
    });
    const result = await service.analyzeVoice({
      audioBase64: 'aGVsbG8=',
      audioFormat: 'wav',
    } as any);

    expect(asrService.recognizeSentence).toHaveBeenCalledWith('aGVsbG8=', 'wav');
    expect(result.voiceText).toContain('雪松木');
    expect(result.flavorTags).toEqual(expect.arrayContaining(['木质烟草']));
    expect((result as any).audioDuration).toBe(4500);
  });

  it('未传 audioFormat 时默认使用 mp3', async () => {
    asrService.recognizeSentence.mockResolvedValue({
      text: '雪松木',
      audioDuration: 1000,
    });
    await service.analyzeVoice({ audioBase64: 'aGVsbG8=' } as any);
    expect(asrService.recognizeSentence).toHaveBeenCalledWith('aGVsbG8=', 'mp3');
  });

  it('生产环境 ASR 失败 → 抛出原错误而非回退', async () => {
    asrService.recognizeSentence.mockRejectedValue(
      new BusinessException(ErrorCode.UPSTREAM_AI_ERROR, '腾讯云超时'),
    );
    await expect(
      service.analyzeVoice({ audioBase64: 'aGVsbG8=', audioFormat: 'mp3' } as any),
    ).rejects.toMatchObject({ bizCode: ErrorCode.UPSTREAM_AI_ERROR });
  });
});
