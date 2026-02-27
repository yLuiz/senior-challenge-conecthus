import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserHttpDto {
    @ApiProperty({ example: 'Luiz Victor' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'luiz@example.com' })
    @IsEmail(undefined, {
        message: 'Email inválido.',
    })
    email: string;

    @ApiProperty({ example: 'Senha@123', minLength: 8 })
    @IsString({ message: 'Senha deve ser um texto.' })
    @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
    @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
        message: 'A senha deve conter ao menos uma letra maiúscula, um número e um caractere especial.',
    })
    password: string;
}
