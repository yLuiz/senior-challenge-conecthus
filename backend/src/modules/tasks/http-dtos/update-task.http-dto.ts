import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTaskHttpDto {
    @ApiPropertyOptional({ example: 'Implementar autenticação' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ example: 'Adicionar JWT ao projeto' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ enum: TaskStatus })
    @IsEnum(TaskStatus)
    @IsOptional()
    status?: TaskStatus;

    @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    dueDate?: string;
}
