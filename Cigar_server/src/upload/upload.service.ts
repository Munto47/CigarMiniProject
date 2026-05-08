import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService } from '../infra/minio/minio.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  constructor(
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('未上传文件');
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('不支持的文件类型，仅支持 jpeg/png/webp/gif');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('文件大小超过 5MB 限制');
    }

    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const ext = path.extname(file.originalname) || '.jpg';
    const objectName = `images/${datePath}/${randomUUID()}${ext}`;

    const url = await this.minioService.uploadFile(
      objectName,
      file.buffer,
      file.size,
      file.mimetype,
    );

    return { url };
  }
}
