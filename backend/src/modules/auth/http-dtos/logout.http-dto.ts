import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutHttpDto {
  @ApiPropertyOptional({ description: 'Access token a ser invalidado imediatamente' })
  @IsOptional()
  @IsString()
  access_token?: string;
}
