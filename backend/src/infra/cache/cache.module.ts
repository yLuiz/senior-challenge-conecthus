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
      useFactory: async () => {
        const redis = envConfig().REDIS;
        return {
          store: await redisStore({
            socket: {
              host: redis.HOST,
              port: redis.PORT,
            },
            ...(redis.USER && { username: redis.USER }),
            ...(redis.PASSWORD && { password: redis.PASSWORD }),
          }),
          ttl: redis.TTL,
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
