import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { UsersService } from '../../users/users.service';
import { JwtPayloadUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
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

    // Check if role was elevated/updated in DB (e.g. upgraded to owner after subscription)
    let currentRole = session.role || payload.role;
    if (currentRole === 'user' && payload.sub) {
      const user = await this.usersService.findById(payload.sub);
      if (user && user.role && user.role !== 'user') {
        currentRole = user.role;
        // Sync the updated role back into the Redis session record
        await this.redisService.setSession(payload.sessionId, {
          ...session,
          role: user.role,
        });
      }
    }

    return {
      ...payload,
      role: currentRole,
    };
  }
}
