import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserHttpDto {
    @ApiProperty({ example: 'Luiz Victor' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'luiz@example.com' })
    @IsEmail(undefined, {
        message: 'Email inválido.',
    })
    email: string;

    @ApiProperty({ example: 'Senha@123', minLength: 6 })
    @IsString({
        message: 'Senha deve ser um texto.',
    })
    @MinLength(6, {
        message: 'Senha deve ter no mínimo 6 caracteres.',
    })
    password: string;
}