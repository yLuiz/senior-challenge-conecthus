import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'luiz@example.com' })
  @IsEmail(undefined, {
    message: 'Email inválido.',
  })
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString({
    message: 'Senha deve ser um texto.',
  })
  password: string;
}
