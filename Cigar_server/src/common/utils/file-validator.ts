import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../constants/error-codes';

// 常见图片格式魔数（文件头字节）
const MAGIC_BYTES: Record<string, number[][]> = {
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP (check further)
  bmp: [[0x42, 0x4d]],
};

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(
  buffer: Buffer,
  originalname: string,
  size: number,
  mimetype?: string,
): void {
  if (size > MAX_FILE_SIZE) {
    throw new BusinessException(ErrorCode.VALIDATION_FAILED, '文件大小不能超过 5MB');
  }

  // 扩展名白名单
  const ext = originalname.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BusinessException(
      ErrorCode.VALIDATION_FAILED,
      `不支持的文件类型: .${ext}，仅允许 ${ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }

  // 魔数校验：根据扩展名匹配对应的文件头字节
  let expectedType: string;
  if (ext === 'jpg' || ext === 'jpeg') {
    expectedType = 'jpeg';
  } else {
    expectedType = ext;
  }

  const signatures = MAGIC_BYTES[expectedType];
  if (!signatures) {
    throw new BusinessException(ErrorCode.VALIDATION_FAILED, '无法校验该文件类型');
  }

  let matched = false;
  for (const sig of signatures) {
    if (sig.every((byte, i) => buffer[i] === byte)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new BusinessException(
      ErrorCode.VALIDATION_FAILED,
      `文件内容与声明的类型 (.${ext}) 不匹配，已拒绝`,
    );
  }
}
