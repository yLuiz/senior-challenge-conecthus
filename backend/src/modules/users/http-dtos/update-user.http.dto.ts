import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserHttpDto {
    @ApiProperty({ example: 'João Silva' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'joao@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'Senha@123', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string;
}