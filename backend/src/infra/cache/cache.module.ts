import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-yet';
import { envConfig } from 'src/config/configuration';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: envConfig().REDIS.HOST,
            port: envConfig().REDIS.PORT,
          },
        }),
        ttl: envConfig().REDIS.TTL,
      }),
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
