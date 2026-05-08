import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly subClient: Redis;

  constructor(private readonly config: ConfigService) {
    const redisOpts = {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      db: config.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) =>
        times > 10 ? null : Math.min(times * 200, 2000),
    };

    this.client = new Redis(redisOpts);
    this.subClient = new Redis(redisOpts);

    this.client.on('connect', () => this.logger.log('Redis 已连接'));
    this.client.on('error', (err) => this.logger.error('Redis 连接错误', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subClient.quit();
  }

  // === String operations ===

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // === Set operations (for blacklists, etc.) ===

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  // === Lock helpers ===

  /** SET NX EX — returns true if lock acquired */
  async setnx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /** Get the raw ioredis client (for advanced operations like pub/sub) */
  get raw(): Redis {
    return this.client;
  }
}
