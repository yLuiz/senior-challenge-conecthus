import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserHttpDto {
    @ApiProperty({ example: 'Luiz Victor' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'luiz@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'Senha@123', minLength: 8 })
    @IsString()
    @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
    @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
        message: 'A senha deve conter ao menos uma letra maiúscula, um número e um caractere especial.',
    })
    @IsOptional()
    password?: string;
}