import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
    controllers: [TasksController],
    providers: [TasksService, PrismaService],
})
export class TasksModule { }
