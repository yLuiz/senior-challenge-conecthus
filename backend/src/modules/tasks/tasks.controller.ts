import { Body, Controller, Delete, Get, HttpException, HttpStatus, InternalServerErrorException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { CreateTaskHttpDto } from './http-dtos/create-task.http-dto';
import { UpdateTaskHttpDto } from './http-dtos/update-task.http-dto';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@Controller('v1/tasks')
export class TasksController {

    constructor(
        private readonly _tasksService: TasksService,
    ) { }

    @Post()
    async create(@Body() body: CreateTaskHttpDto) {
        try {
            return await this._tasksService.create(body);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @Get()
    async findAll(@Query() pagination: PaginationQueryDto) {
        try {
            return await this._tasksService.findAll(pagination);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @ApiParam({ name: 'id', example: 'uuid-da-tarefa', required: true, description: 'UUID da tarefa' })
    @Get(':id')
    async findById(@Param('id') id: string) {
        try {
            return await this._tasksService.findById(id);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @ApiParam({ name: 'id', example: 'uuid-da-tarefa', required: true, description: 'UUID da tarefa' })
    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: UpdateTaskHttpDto) {
        try {
            return await this._tasksService.update(id, body);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }

    @ApiParam({ name: 'id', example: 'uuid-da-tarefa', required: true, description: 'UUID da tarefa' })
    @Delete(':id')
    async delete(@Param('id') id: string) {
        try {
            await this._tasksService.delete(id);
            return { statusCode: HttpStatus.OK, message: 'Task deleted' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(err.message);
        }
    }
}
