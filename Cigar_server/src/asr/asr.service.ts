import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asr } from 'tencentcloud-sdk-nodejs-asr';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

export interface SentenceRecognitionResult {
  text: string;
  audioDuration: number;
  wordList?: Array<{ word: string; startTime: number; endTime: number }>;
}

@Injectable()
export class AsrService {
  private readonly logger = new Logger(AsrService.name);
  private readonly client: InstanceType<typeof asr.v20190614.Client>;

  constructor(private readonly config: ConfigService) {
    const secretId = config.get<string>('TENCENT_SECRET_ID', '');
    const secretKey = config.get<string>('TENCENT_SECRET_KEY', '');

    if (secretId !== '' && secretKey !== '') {
      this.client = new asr.v20190614.Client({
        credential: { secretId, secretKey },
        region: config.get<string>('TENCENT_ASR_REGION', 'ap-guangzhou'),
        profile: {
          signMethod: 'TC3-HMAC-SHA256',
          httpProfile: {
            reqMethod: 'POST',
            reqTimeout: 30,
          },
        },
      });
    }
  }

  async recognizeSentence(
    audioBase64: string,
    audioFormat: string,
  ): Promise<SentenceRecognitionResult> {
    if (!this.client) {
      throw new BusinessException(
        ErrorCode.UPSTREAM_AI_ERROR,
        '腾讯云 ASR 凭证未配置 (TENCENT_SECRET_ID / TENCENT_SECRET_KEY)',
      );
    }

    const dataLen = Buffer.from(audioBase64, 'base64').length;

    try {
      const response = await this.client.SentenceRecognition({
        EngSerViceType: '16k_zh',
        SourceType: 1,
        VoiceFormat: audioFormat,
        Data: audioBase64,
        DataLen: dataLen,
        FilterDirty: 0,
        FilterModal: 0,
        FilterPunc: 0,
        ConvertNumMode: 1,
      });

      return {
        text: response.Result ?? '',
        audioDuration: response.AudioDuration ?? 0,
        wordList: (response.WordList ?? []).map((w) => ({
          word: w.Word ?? '',
          startTime: w.StartTime ?? 0,
          endTime: w.EndTime ?? 0,
        })),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`腾讯云 ASR 识别失败: ${msg}`);
      throw new BusinessException(
        ErrorCode.UPSTREAM_AI_ERROR,
        `语音识别失败: ${msg}`,
      );
    }
  }
}
