import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { JwtPayloadUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'ora-secret-key-change-in-prod',
    });
  }

  async validate(payload: JwtPayloadUser): Promise<JwtPayloadUser> {
    if (!payload || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload structure.');
    }

    const session = await this.redisService.getSession(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException(
        'Session has expired or was revoked. Please log in again.',
      );
    }

    return payload;
  }
}
