import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dtos/paginated-result.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { HTTP_MESSAGES } from 'src/common/messages/http.messages';
import { CreateTaskHttpDto } from './http-dtos/create-task.http-dto';
import { OutputTaskHttpDto } from './http-dtos/output-task.http-dto';
import { UpdateTaskHttpDto } from './http-dtos/update-task.http-dto';

@Injectable()
export class TasksService {
  constructor(
    private _prisma: PrismaService,
  ) { }

  async create(dto: CreateTaskHttpDto): Promise<OutputTaskHttpDto> {
    const { title, description, status, dueDate, userId } = dto;

    return this._prisma.task.create({
      data: {
        title,
        description,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId,
      },
    });
  }

  async findAll({ page, limit }: PaginationQueryDto): Promise<PaginatedResultDto<OutputTaskHttpDto>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this._prisma.$transaction([
      this._prisma.task.findMany({ skip, take: limit }),
      this._prisma.task.count(),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(id: string): Promise<OutputTaskHttpDto> {
    const task = await this._prisma.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException(HTTP_MESSAGES.TASK.NOT_FOUND);

    return task;
  }

  async update(id: string, dto: UpdateTaskHttpDto): Promise<OutputTaskHttpDto> {
    await this.findById(id);

    return this._prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);

    await this._prisma.task.delete({ where: { id } });
  }
}
