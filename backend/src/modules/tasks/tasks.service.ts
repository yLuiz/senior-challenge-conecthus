import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dtos/paginated-result.dto';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';
import { MqttService } from '../../infra/mqtt/mqtt.service';
import { HTTP_MESSAGES } from 'src/common/messages/http.messages';
import { CreateTaskHttpDto } from './http-dtos/create-task.http-dto';
import { OutputTaskHttpDto } from './http-dtos/output-task.http-dto';
import { UpdateTaskHttpDto } from './http-dtos/update-task.http-dto';
import { TaskQueryDto } from './http-dtos/task-query.http-dto';

@Injectable()
export class TasksService {
  private readonly _logger = new Logger(TasksService.name);

  constructor(
    private _prisma: PrismaService,
    private _cache: RedisService,
    private _mqtt: MqttService,
  ) { }

  async create(dto: CreateTaskHttpDto, userId: string): Promise<OutputTaskHttpDto> {
    const { title, description, status, dueDate } = dto;

    const task = await this._prisma.task.create({
      data: {
        title,
        description,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId,
      },
    });

    await this._cache.delByPattern('tasks:all');
    this._mqtt.publishTaskCreated(userId, { id: task.id, title: task.title });
    this._logger.log(`Task created: ${task.id}`);

    return task;
  }

  async findAll({ page, limit, status, dueDate }: TaskQueryDto): Promise<PaginatedResultDto<OutputTaskHttpDto>> {
    const cacheKey = `tasks:all:${page}:${limit}:${status ?? ''}:${dueDate ?? ''}`;

    const cached = await this._cache.get<PaginatedResultDto<OutputTaskHttpDto>>(cacheKey);
    if (cached) {
      this._logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    this._logger.debug(`Cache MISS: ${cacheKey}`);

    const skip = (page - 1) * limit;
    const where = {
      ...(status ? { status } : {}),
      ...(dueDate ? { dueDate: { lte: new Date(dueDate) } } : {}),
    };

    const [data, total] = await this._prisma.$transaction([
      this._prisma.task.findMany({ where, skip, take: limit }),
      this._prisma.task.count({ where }),
    ]);

    const result = new PaginatedResultDto(data, total, page, limit);
    await this._cache.set(cacheKey, result);

    return result;
  }

  async findById(id: string): Promise<OutputTaskHttpDto> {
    const task = await this._prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException(HTTP_MESSAGES.TASK.NOT_FOUND);

    return task;
  }

  async update(id: string, dto: UpdateTaskHttpDto): Promise<OutputTaskHttpDto> {
    await this.findById(id);

    const task = await this._prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    await this._cache.delByPattern('tasks:all');
    this._mqtt.publishTaskUpdated(task.userId, { id: task.id, title: task.title });
    this._logger.log(`Task updated: ${id}`);

    return task;
  }

  async delete(id: string): Promise<void> {
    const task = await this.findById(id);

    await this._prisma.task.delete({ where: { id } });
    await this._cache.delByPattern('tasks:all');
    this._mqtt.publishTaskDeleted(task.userId, { id: task.id, title: task.title });
    this._logger.log(`Task deleted: ${id}`);
  }
}
