import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { RedisService } from '../../../infra/cache/redis.service';
import { PaginatedResultDto } from '../../../common/dtos/paginated-result.dto';
import { UsersService } from '../users.service';
import { envConfig } from 'src/config/configuration';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const mockPrisma = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  userProfileKey: jest.fn((id: string) => `user:profile:${id}`),
};

const baseUser = {
  id: 'user-1',
  name: 'Luiz Victor',
  email: 'luiz@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

let PASSWORD_SALT: number;

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    PASSWORD_SALT = envConfig().PASSWORD_SALT;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();

    // Reaplica os valores padrão limpos pelo clearAllMocks
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);
    mockCache.userProfileKey.mockImplementation((id: string) => `user:profile:${id}`);
  });

  describe('create', () => {
    it('should hash the password and create a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.create({
        name: 'Luiz Victor',
        email: 'luiz@example.com',
        password: 'Senha@123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Senha@123', PASSWORD_SALT);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'luiz@example.com',
            password: 'hashed_password',
          }),
        }),
      );
      expect(result).toEqual(baseUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, password: 'hashed' });

      await expect(
        service.create({ name: 'Luiz Victor', email: 'luiz@example.com', password: 'Senha@123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return a paginated result', async () => {
      const users = [baseUser];
      mockPrisma.$transaction.mockResolvedValue([users, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(baseUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should store the user profile in cache after a cache miss', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await service.findById('user-1');

      expect(mockCache.set).toHaveBeenCalledWith('user:profile:user-1', baseUser);
    });

    it('should return cached user profile on cache hit', async () => {
      mockCache.get.mockResolvedValue(baseUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(baseUser);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return the full user (with password) when found', async () => {
      const userWithPassword = { ...baseUser, password: 'hashed' };
      mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);

      const result = await service.findByEmail('luiz@example.com');

      expect(result).toEqual(userWithPassword);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'luiz@example.com' },
      });
    });

    it('should return null when email is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updated = { ...baseUser, name: 'Novo Nome' };
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update('user-1', { name: 'Novo Nome' });

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('should invalidate the user profile cache after update', async () => {
      const updated = { ...baseUser, name: 'Novo Nome' };
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue(updated);

      await service.update('user-1', { name: 'Novo Nome' });

      expect(mockCache.del).toHaveBeenCalledWith('user:profile:user-1');
    });

    it('should throw ConflictException if new email belongs to another user', async () => {
      const otherUser = { ...baseUser, id: 'other-user', password: 'hashed' };
 
      mockPrisma.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.update('user-1', { email: 'luiz@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw if the email belongs to the same user', async () => {
      const sameUser = { ...baseUser, password: 'hashed' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser)  // findById
        .mockResolvedValueOnce(sameUser); // findByEmail retorna o mesmo usuário
      mockPrisma.user.update.mockResolvedValue(baseUser);

      await expect(
        service.update('user-1', { email: 'luiz@example.com' }),
      ).resolves.toEqual(baseUser);
    });
  });

  describe('delete', () => {
    it('should delete and return the deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.delete.mockResolvedValue(baseUser);

      const result = await service.delete('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual(baseUser);
    });

    it('should invalidate the user profile cache after deletion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.delete.mockResolvedValue(baseUser);

      await service.delete('user-1');

      expect(mockCache.del).toHaveBeenCalledWith('user:profile:user-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
