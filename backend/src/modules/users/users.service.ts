import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginatedResultDto } from '../../common/dtos/paginated-result.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { CreateUserHttpDto } from './http-dtos/create-user.http-dto';
import { OutputUserHttpDto } from './http-dtos/output-user.http-dto';
import { UpdateUserHttpDto } from './http-dtos/update-user.http.dto';
import { HTTP_MESSAGES } from 'src/common/messages/http.messages';

@Injectable()
export class UsersService {
  constructor(
    private _prisma: PrismaService,
  ) { }

  private _logger = new Logger();

  private _userFieldsToGet = {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  };

  async create(dto: CreateUserHttpDto): Promise<OutputUserHttpDto> {

    const { name, email, password } = dto;

    const emailAlreadyExists = await this.findByEmail(email);
    if (emailAlreadyExists) {
      this._logger.warn(`Register attempt with existing email: ${email}`);
      throw new ConflictException(HTTP_MESSAGES.USER.EMAIL_ALREADY_EXISTS);
    }

    const SALT = parseInt(process.env.PASSWORD_SALT, 10);
    const hashed = await bcrypt.hash(password, SALT);

    const user = await this._prisma.user.create({
      data: { name: name, email: email, password: hashed },
      select: { ...this._userFieldsToGet },
    });

    return user;
  }

  async findAll({ page, limit }: PaginationQueryDto): Promise<PaginatedResultDto<OutputUserHttpDto>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this._prisma.$transaction([
      this._prisma.user.findMany({
        skip,
        take: limit,
        select: { ...this._userFieldsToGet },
      }),
      this._prisma.user.count(),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async findById(id: string): Promise<OutputUserHttpDto> {

    const user = await this._prisma.user.findUnique({
      where: { id },
      select: { ...this._userFieldsToGet },
    });

    if (!user) throw new NotFoundException(HTTP_MESSAGES.USER.NOT_FOUND);

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this._prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, dto: UpdateUserHttpDto): Promise<OutputUserHttpDto> {
    const userExists = this.findById(id);
    if (!userExists) throw new NotFoundException(HTTP_MESSAGES.USER.NOT_FOUND);

    if (dto.email) {
      const emailAlreadyExists = await this.findByEmail(dto.email);
      if (emailAlreadyExists && emailAlreadyExists.id !== id) throw new ConflictException(HTTP_MESSAGES.USER.EMAIL_ALREADY_EXISTS);
    }

    return this._prisma.user.update({
      where: { id },
      data: { ...dto },
      select: { ...this._userFieldsToGet },
    });
  }

  async delete(id: string) {

    const userExistis = await this.findById(id);
    if (!userExistis) throw new NotFoundException(HTTP_MESSAGES.USER.NOT_FOUND);

    return this._prisma.user.delete({ where: { id } });
  }
}
