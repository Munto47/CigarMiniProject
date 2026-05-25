import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService } from '../infra/minio/minio.service';
import { validateImageFile } from '../common/utils/file-validator';
import { randomUUID } from 'crypto';
import * as path from 'path';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  constructor(
    private readonly minioService: MinioService,
    private readonly config: ConfigService,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('未上传文件');

    // 魔数校验：验证文件真实类型而非信任 Content-Type
    validateImageFile(file.buffer, file.originalname, file.size, file.mimetype);

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
