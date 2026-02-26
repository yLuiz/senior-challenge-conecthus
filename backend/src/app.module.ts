import { Module } from '@nestjs/common';
import { PrismaModule } from './infra/database/prisma/prisma.module';
import { CacheModule } from './infra/cache/cache.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    TasksModule
  ],
  providers: [],
})
export class AppModule { }
