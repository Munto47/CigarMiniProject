import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';
/**
 * 标记接口需要幂等键保护
 * 配合 IdempotencyGuard 使用，自动读取 Idempotency-Key 请求头
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
