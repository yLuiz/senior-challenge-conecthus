import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginatedResultDto } from '../../common/dtos/paginated-result.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';
import { CreateUserHttpDto } from './http-dtos/create-user.http-dto';
import { OutputUserHttpDto } from './http-dtos/output-user.http-dto';
import { UpdateUserHttpDto } from './http-dtos/update-user.http.dto';
import { HTTP_MESSAGES } from 'src/common/messages/http.messages';

@Injectable()
export class UsersService {
  constructor(
    private _prisma: PrismaService,
    private _cache: RedisService,
  ) { }

  private _logger = new Logger(UsersService.name);

  private _userFieldsToGet = {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  };

  private async _invalidateCache(userId: string): Promise<void> {
    await this._cache.del(this._cache.userProfileKey(userId));
  }

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
      data: { name, email, password: hashed },
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
    const cacheKey = this._cache.userProfileKey(id);

    const cached = await this._cache.get<OutputUserHttpDto>(cacheKey);
    if (cached) {
      this._logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    this._logger.debug(`Cache MISS: ${cacheKey}`);

    const user = await this._prisma.user.findUnique({
      where: { id },
      select: { ...this._userFieldsToGet },
    });

    if (!user) throw new NotFoundException(HTTP_MESSAGES.USER.NOT_FOUND);

    await this._cache.set(cacheKey, user);
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

    if (dto.password) {
      const SALT = parseInt(process.env.PASSWORD_SALT, 10);
      const hashed = await bcrypt.hash(dto.password, SALT);
      dto.password = hashed;
    }

    const user = await this._prisma.user.update({
      where: { id },
      data: { ...dto },
      select: { ...this._userFieldsToGet },
    });

    await this._invalidateCache(id);
    return user;
  }

  async delete(id: string) {
    const userExists = await this.findById(id);
    if (!userExists) throw new NotFoundException(HTTP_MESSAGES.USER.NOT_FOUND);

    await this._invalidateCache(id);
    return this._prisma.user.delete({ where: { id } });
  }
}
