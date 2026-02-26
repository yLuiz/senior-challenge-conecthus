import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { envConfig } from 'src/config/configuration';
import { PrismaService } from 'src/infra/database/prisma/prisma.service';
import { CreateUserHttpDto } from '../users/http-dtos/create-user.http-dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './http-dtos/login.http-dto';
import { HTTP_MESSAGES } from 'src/common/messages/http.messages';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private _prisma: PrismaService,
    private _usersService: UsersService,
    private _jwtService: JwtService,
  ) {}

  private async _generateTokens(userId: string, email: string) {
    const jti = randomUUID();

    const [access_token, refresh_token] = await Promise.all([
      this._jwtService.sign(
        { sub: userId, email },
        { secret: envConfig().JWT.SECRET, expiresIn: envConfig().JWT.EXPIRATION },
      ),
      this._jwtService.sign(
        { sub: userId, email, jti },
        { secret: envConfig().JWT.REFRESH_SECRET, expiresIn: envConfig().JWT.REFRESH_EXPIRATION },
      ),
    ]);

    const SALT = parseInt(process.env.PASSWORD_SALT, 10);
    const hashed = await bcrypt.hash(refresh_token, SALT);

    const decoded = this._jwtService.decode(refresh_token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this._prisma.refreshToken.create({
      data: { id: jti, token: hashed, userId, expiresAt },
    });

    return { access_token, refresh_token };
  }

  async register(dto: CreateUserHttpDto) {
    const existing = await this._usersService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`Register attempt with existing email: ${dto.email}`);
      throw new ConflictException(HTTP_MESSAGES.USER.EMAIL_ALREADY_EXISTS);
    }

    const user = await this._usersService.create(dto);
    this.logger.log(`User registered: ${user.id}`, AuthService.name);

    const tokens = await this._generateTokens(user.id, user.email);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this._usersService.findByEmail(dto.email);
    if (!user) {
      this.logger.warn(`Failed login attempt — email not found: ${dto.email}`, AuthService.name);
      throw new UnauthorizedException(HTTP_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      this.logger.warn(`Failed login attempt — wrong password for user: ${user.id}`);
      throw new UnauthorizedException(HTTP_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    this.logger.log(`User logged in: ${user.id}`, AuthService.name);

    const { password: _, ...safeUser } = user;
    const tokens = await this._generateTokens(user.id, user.email);
    return { user: safeUser, ...tokens };
  }

  async refresh(userId: string, email: string, jti: string, rawRefreshToken: string) {
    const stored = await this._prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!stored || stored.userId !== userId) throw new UnauthorizedException(HTTP_MESSAGES.AUTH.ACCESS_DENIED);

    const tokenMatches = await bcrypt.compare(rawRefreshToken, stored.token);
    if (!tokenMatches) throw new UnauthorizedException(HTTP_MESSAGES.AUTH.ACCESS_DENIED);

    await this._prisma.refreshToken.delete({ where: { id: jti } });

    const user = await this._usersService.findById(userId);
    const tokens = await this._generateTokens(userId, email);
    return { user, ...tokens };
  }

  async logout(userId: string, jti: string) {
    await this._prisma.refreshToken.deleteMany({ where: { id: jti, userId } });
  }

  async getProfile(userId: string) {
    return this._usersService.findById(userId);
  }
}
