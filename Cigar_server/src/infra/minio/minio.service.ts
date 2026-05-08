import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'cigar_minio');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minio_pass123');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'cigar-assets');

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" 已创建`);
      }
      this.logger.log(`MinIO 连接成功 (${endpoint}:${port})`);
    } catch (err) {
      this.logger.warn(`MinIO 连接失败，文件上传将不可用: ${(err as Error).message}`);
    }
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    size: number,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, size, {
      'Content-Type': contentType,
    });

    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    const port = this.config.get<number>('MINIO_PORT');
    const useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    return `${protocol}://${endpoint}:${port}/${this.bucket}/${objectName}`;
  }

  getClient(): Minio.Client {
    return this.client;
  }
}
