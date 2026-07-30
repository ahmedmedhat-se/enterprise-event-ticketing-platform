import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs) {
      await this.client.set(key, value, 'PX', ttlMs);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Returns true when the key was set (caller won the lock), false otherwise.
   * Used by the seat-hold flow to guarantee exactly one holder per seat.
   */
  async setNx(key: string, value: string, ttlMs: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /** Update the TTL of an existing key (milliseconds). */
  async pexpire(key: string, ttlMs: number): Promise<void> {
    await this.client.pexpire(key, ttlMs);
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      await this.client.del(...key);
    } else {
      await this.client.del(key);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      this.logger.warn(`Failed to parse JSON for key: ${key}`);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlMs);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
