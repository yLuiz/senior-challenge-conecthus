import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER) private _cache: Cache
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this._cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this._cache.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this._cache.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // Invalidates all keys matching the prefix pattern
    const store = this._cache.stores[0]?.store as { keys?: (pattern: string) => Promise<string[]> } | undefined;
    if (store && typeof store.keys === 'function') {
      const keys = await store.keys(pattern + '*');
      await Promise.all(keys.map((k) => this._cache.del(k)));
    }
  }

  taskListKey(userId: string, query?: string): string {
    return `tasks:${userId}:${query || 'all'}`;
  }

  userProfileKey(userId: string): string {
    return `user:${userId}`;
  }
}
