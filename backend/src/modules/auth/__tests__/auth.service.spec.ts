import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/infra/database/prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';

const mockPrisma = {
  user: { create: jest.fn() },
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const created = { id: '1', email: 'test@test.com', name: 'Test', createdAt: new Date() };
      mockUsersService.create.mockResolvedValue(created);

      const result = await service.register({
        name: 'Test',
        email: 'test@test.com',
        password: 'pass123',
      });

      expect(result.access_token).toBe('mock-token');
      expect(result.user).toEqual(created);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.register({ name: 'Test', email: 'test@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({ email: 'test@test.com', password: 'pass123' });

      expect(result.access_token).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashed,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
