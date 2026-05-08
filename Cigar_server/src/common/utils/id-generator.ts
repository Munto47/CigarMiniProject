import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';

function dateStr(): string {
  return new Date()
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '');
}

function seqPart(seq: number): string {
  return String(seq).padStart(6, '0');
}

function tsSuffix(): string {
  return String(Date.now() % 1000000).padStart(6, '0');
}

/** 无 Redis 的简易单号生成 */
export function generateOrderNo(): string {
  return `ORD${dateStr()}${tsSuffix()}`;
}

export function generatePaymentNo(): string {
  return `PAY${dateStr()}${tsSuffix()}`;
}

export function generateRechargeNo(): string {
  return `R${dateStr()}${tsSuffix()}`;
}

export function generateRefundNo(): string {
  return `REF${dateStr()}${tsSuffix()}`;
}

/**
 * 单号生成器（基于 Redis 递增序列）
 * 格式：{prefix}{yyyyMMdd}{6位序列}
 */
@Injectable()
export class IdGenerator {
  constructor(private readonly redis: RedisService) {}

  async next(prefix: string): Promise<string> {
    const key = `seq:${prefix}:${dateStr()}`;
    const seq = await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 2);
    return `${prefix}${dateStr()}${seqPart(seq)}`;
  }

  async nextOrderNo(): Promise<string> { return this.next('ORD'); }
  async nextPaymentNo(): Promise<string> { return this.next('PAY'); }
  async nextRechargeNo(): Promise<string> { return this.next('R'); }
  async nextRefundNo(): Promise<string> { return this.next('REF'); }
}
