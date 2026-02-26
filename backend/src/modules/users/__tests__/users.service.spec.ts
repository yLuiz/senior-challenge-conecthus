import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { PaginatedResultDto } from '../../../common/dtos/paginated-result.dto';
import { UsersService } from '../users.service';

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

const baseUser = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    process.env.PASSWORD_SALT = '10';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should hash the password and create a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.create({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'Senha@123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Senha@123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'joao@example.com',
            password: 'hashed_password',
          }),
        }),
      );
      expect(result).toEqual(baseUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, password: 'hashed' });

      await expect(
        service.create({ name: 'João Silva', email: 'joao@example.com', password: 'Senha@123' }),
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

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return the full user (with password) when found', async () => {
      const userWithPassword = { ...baseUser, password: 'hashed' };
      mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);

      const result = await service.findByEmail('joao@example.com');

      expect(result).toEqual(userWithPassword);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'joao@example.com' },
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

    it('should throw ConflictException if new email belongs to another user', async () => {
      const otherUser = { ...baseUser, id: 'other-user', password: 'hashed' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser)  // unawaited findById inside update
        .mockResolvedValueOnce(otherUser); // findByEmail

      await expect(
        service.update('user-1', { email: 'joao@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw if the email belongs to the same user', async () => {
      const sameUser = { ...baseUser, password: 'hashed' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser)  // unawaited findById
        .mockResolvedValueOnce(sameUser); // findByEmail returns same user
      mockPrisma.user.update.mockResolvedValue(baseUser);

      await expect(
        service.update('user-1', { email: 'joao@example.com' }),
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

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
