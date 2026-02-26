import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserHttpDto {
    @ApiProperty({ example: 'Luiz Victor' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'luiz@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'Senha@123', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string;
}