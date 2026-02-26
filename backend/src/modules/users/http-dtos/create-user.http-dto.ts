import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserHttpDto {
    @ApiProperty({ example: 'João Silva' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'joao@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Senha@123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;
}