import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/infra/database/prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';

const mockPrisma = {
  user: { create: jest.fn() },
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    process.env.PASSWORD_SALT = '10';

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

    // Reaplica os valores padrão limpos pelo clearAllMocks
    mockJwtService.sign.mockReturnValue('mock-token');
    mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.refreshToken.delete.mockResolvedValue({});
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const created = { id: '1', email: 'test@test.com', name: 'Test', createdAt: new Date() };
      mockUsersService.create.mockResolvedValue(created);

      const result = await service.register({
        name: 'Test',
        email: 'test@test.com',
        password: 'pass123',
      });

      expect(result.access_token).toBe('mock-token');
      expect(result.refresh_token).toBe('mock-token');
      expect(result.user).toEqual(created);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.register({ name: 'Test', email: 'test@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
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
      expect(result.refresh_token).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
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

  describe('refresh', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const rawToken = 'raw-refresh-token';
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const storedToken = { id: 'jti-123', userId: 'user-1', token: hashedToken, expiresAt: new Date() };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockUsersService.findById.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test' });

      const result = await service.refresh('user-1', 'test@test.com', 'jti-123', rawToken);

      expect(result.access_token).toBe('mock-token');
      expect(result.refresh_token).toBe('mock-token');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'jti-123' } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when stored token is not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh('user-1', 'test@test.com', 'jti-123', 'any-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when userId does not match stored token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'jti-123',
        userId: 'other-user',
        token: 'some-hash',
        expiresAt: new Date(),
      });

      await expect(
        service.refresh('user-1', 'test@test.com', 'jti-123', 'any-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when raw token does not match stored hash', async () => {
      const storedHash = await bcrypt.hash('correct-token', 10);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'jti-123',
        userId: 'user-1',
        token: storedHash,
        expiresAt: new Date(),
      });

      await expect(
        service.refresh('user-1', 'test@test.com', 'jti-123', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete the refresh token for the given session', async () => {
      await service.logout('user-1', 'jti-123');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { id: 'jti-123', userId: 'user-1' },
      });
    });
  });

  describe('getProfile', () => {
    it('should return the user profile by id', async () => {
      const user = { id: 'user-1', email: 'test@test.com', name: 'Test', createdAt: new Date() };
      mockUsersService.findById.mockResolvedValue(user);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(user);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-1');
    });
  });
});
