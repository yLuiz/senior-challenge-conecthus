import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envConfig } from 'src/config/configuration';
import { RedisService } from 'src/infra/cache/redis.service';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private users: UsersService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig().JWT.SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.jti) {
      const blacklisted = await this.redis.get(`blacklist:access:${payload.jti}`);
      if (blacklisted) throw new UnauthorizedException();
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
