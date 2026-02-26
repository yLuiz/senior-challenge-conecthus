import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // Invalidates all keys matching the prefix pattern
    const store = (this.cache as any).store;
    if (store && typeof store.keys === 'function') {
      const keys: string[] = await store.keys(pattern + '*');
      await Promise.all(keys.map((k) => this.cache.del(k)));
    }
  }

  taskListKey(userId: string, query?: string): string {
    return `tasks:${userId}:${query || 'all'}`;
  }

  userProfileKey(userId: string): string {
    return `user:${userId}`;
  }
}
